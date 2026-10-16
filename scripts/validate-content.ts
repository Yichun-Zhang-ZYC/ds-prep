/**
 * npm run validate — content checks run locally and in CI before deploy (DESIGN.md §6.4).
 *
 * Errors (exit 1):
 *   - curriculum.json shape, duplicate or non-kebab-case ids
 *   - a lesson file not listed in curriculum.json, or listed under a different section
 *   - frontmatter missing / invalid, or frontmatter id ≠ file name
 *   - interactive block JSON that doesn't parse or match its schema; duplicate block ids in a lesson
 *   - sql-exercise solution that fails on its own setup (run with sql.js)
 *   - python-exercise solution that fails its own tests (run with local python3)
 *   - <id>.zh.md without <id>.md, zh frontmatter id mismatch, or a Chinese file whose
 *     "##" sections / block sequence differ from English, or whose block translations are invalid
 * Warnings:
 *   - lesson doesn't end with an "Interview tips" callout
 *   - lesson has no Chinese translation (<id>.zh.md)
 * Info:
 *   - planned lessons in curriculum.json without a file (shown as "Coming soon")
 *
 * Set SKIP_PYTHON=1 to skip running Python solutions (e.g. on a machine without numpy).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { BLOCK_CHECKS, checkFrontmatter, checkFrontmatterZh, checkZhOverlay, extractBlocks, splitFrontmatter } from '../src/content/parse';
import { compareShapes, splitLesson, splitParagraphs } from '../src/content/segments';
import type { Curriculum, PythonExerciseData, SqlExerciseData } from '../src/content/types';
import { ROLE_KEYS } from '../src/content/types';
import { compareResults, lastResult } from '../src/runtimes/sqlCompare';

const ROOT = resolve(import.meta.dirname, '..');
const LESSONS = join(ROOT, 'content/lessons');
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

function loadCurriculum(): Curriculum | null {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'content/curriculum.json'), 'utf8'));
  } catch (e) {
    err('content/curriculum.json', `cannot read: ${(e as Error).message}`);
    return null;
  }
}

function checkCurriculum(c: Curriculum) {
  const ids = { section: new Set<string>(), subtopic: new Set<string>(), lesson: new Set<string>() };
  const where = 'curriculum.json';
  if (!Array.isArray(c.sections)) return err(where, '"sections" must be an array');
  for (const s of c.sections) {
    if (!KEBAB.test(s.id ?? '')) err(where, `section id "${s.id}" is not kebab-case`);
    if (ids.section.has(s.id)) err(where, `duplicate section id "${s.id}"`);
    ids.section.add(s.id);
    if (!s.title) err(where, `section "${s.id}" has no title`);
    for (const k of Object.keys(s.roles ?? {}))
      if (!(ROLE_KEYS as readonly string[]).includes(k)) err(where, `section "${s.id}" has unknown role key "${k}"`);
    for (const st of s.subtopics ?? []) {
      if (!KEBAB.test(st.id ?? '')) err(where, `subtopic id "${st.id}" is not kebab-case`);
      if (ids.subtopic.has(st.id)) err(where, `duplicate subtopic id "${st.id}"`);
      ids.subtopic.add(st.id);
      for (const l of st.lessons ?? []) {
        if (typeof l !== 'object' || !l.id || !l.title) { err(where, `lesson entry in "${st.id}" needs { id, title }`); continue; }
        if (!KEBAB.test(l.id)) err(where, `lesson id "${l.id}" is not kebab-case`);
        if (ids.lesson.has(l.id)) err(where, `duplicate lesson id "${l.id}"`);
        ids.lesson.add(l.id);
      }
    }
  }
}

async function main() {
  const curriculum = loadCurriculum();
  if (!curriculum) return finish();
  checkCurriculum(curriculum);

  const sectionOf = new Map<string, string>();
  for (const s of curriculum.sections) for (const st of s.subtopics) for (const l of st.lessons) sectionOf.set(l.id, s.id);

  const SQL = await initSqlJs();
  const pythonJobs: { where: string; code: string }[] = [];
  let zhCount = 0;
  const found = new Set<string>();

  const sectionDirs = existsSync(LESSONS) ? readdirSync(LESSONS, { withFileTypes: true }).filter(d => d.isDirectory()) : [];
  for (const dir of sectionDirs) {
    const files = readdirSync(join(LESSONS, dir.name)).filter(f => f.endsWith('.md'));
    for (const file of files.filter(f => f.endsWith('.zh.md'))) {
      if (!files.includes(file.replace(/\.zh\.md$/, '.md'))) err(`content/lessons/${dir.name}/${file}`, 'Chinese file has no English counterpart');
    }
    for (const file of files.filter(f => !f.endsWith('.zh.md'))) {
      const where = `content/lessons/${dir.name}/${file}`;
      const fileId = file.replace(/\.md$/, '');
      const raw = readFileSync(join(LESSONS, dir.name, file), 'utf8');
      let parsed;
      try {
        parsed = splitFrontmatter(raw);
      } catch (e) {
        err(where, `frontmatter is not valid YAML: ${(e as Error).message}`);
        continue;
      }
      const { fm, errors: fmErrors } = checkFrontmatter(parsed.data);
      fmErrors.forEach(m => err(where, m));
      if (fm && fm.id !== fileId) err(where, `frontmatter id "${fm.id}" must match the file name "${fileId}"`);
      found.add(fileId);

      const expectedSection = sectionOf.get(fileId);
      if (!expectedSection) err(where, `lesson "${fileId}" is not listed in curriculum.json`);
      else if (expectedSection !== dir.name) err(where, `lesson "${fileId}" is listed under section "${expectedSection}" in curriculum.json`);

      const blockIds = new Map<string, Set<string>>();
      const fmLines = raw.slice(0, raw.length - parsed.body.length).split('\n').length - 1;
      for (const block of extractBlocks(parsed.body)) {
        const at = `${where}:${block.line + fmLines}`;
        const { data, errors: blockErrors } = BLOCK_CHECKS[block.kind](block.source);
        blockErrors.forEach(m => err(at, m));
        if (!data) continue;
        const id = (data as { id?: string }).id;
        if (id) {
          const seen = blockIds.get(block.kind) ?? new Set<string>();
          if (seen.has(id)) err(at, `duplicate ${block.kind} id "${id}" in this lesson`);
          seen.add(id);
          blockIds.set(block.kind, seen);
        }

        if (block.kind === 'sql-exercise') {
          const ex = data as SqlExerciseData;
          try {
            const run = (q: string) => {
              const db = new SQL.Database();
              try {
                db.run(ex.setup);
                return lastResult(db.exec(q));
              } finally {
                db.close();
              }
            };
            const expected = run(ex.solution);
            if (!expected.columns.length) err(at, 'sql-exercise solution returns no result set');
            else if (!compareResults(run(ex.solution), expected, ex.orderMatters).ok) err(at, 'sql-exercise solution is not deterministic');
            try {
              const starter = run(ex.starterCode);
              if (starter.columns.length && compareResults(starter, expected, ex.orderMatters).ok) warn(at, 'starterCode already passes the check');
            } catch { /* starter code is allowed to be incomplete */ }
          } catch (e) {
            err(at, `sql-exercise solution fails: ${(e as Error).message}`);
          }
        }

        if (block.kind === 'python-exercise') {
          const ex = data as PythonExerciseData;
          // Pyodide runs code from a string, so there is no source file for inspect to read.
          if (/\binspect\.getsource/.test(`${ex.setup ?? ''}\n${ex.tests}`)) err(at, 'python-exercise: inspect.getsource does not work in Pyodide');
          pythonJobs.push({ where: at, code: [ex.setup, ex.solution, ex.tests].filter(Boolean).join('\n\n') });
        }
      }

      if (!/>\s*\[!TIP\][^\n]*interview tips/i.test(parsed.body)) warn(where, 'lesson should end with a "> [!TIP] Interview tips" callout');

      // ----- Chinese translation -----
      const zhFile = `${fileId}.zh.md`;
      const zhWhere = `content/lessons/${dir.name}/${zhFile}`;
      if (!files.includes(zhFile)) {
        warn(where, 'no Chinese translation (.zh.md)');
      } else {
        zhCount++;
        const zhRaw = readFileSync(join(LESSONS, dir.name, zhFile), 'utf8');
        let zhParsed;
        try {
          zhParsed = splitFrontmatter(zhRaw);
        } catch (e) {
          err(zhWhere, `frontmatter is not valid YAML: ${(e as Error).message}`);
          continue;
        }
        const zfm = checkFrontmatterZh(zhParsed.data);
        zfm.errors.forEach(m => err(zhWhere, m));
        if (zfm.fm && zfm.fm.id !== fileId) err(zhWhere, `frontmatter id "${zfm.fm.id}" must be "${fileId}"`);
        const enSecs = splitLesson(parsed.body);
        const zhSecs = splitLesson(zhParsed.body);
        const shapeErrors = compareShapes(enSecs, zhSecs);
        shapeErrors.forEach(m => err(zhWhere, m));
        if (!shapeErrors.length) {
          enSecs.forEach((sec, i) =>
            sec.segments.forEach((seg, j) => {
              const zseg = zhSecs[i].segments[j];
              if (seg.type === 'md' && zseg.type === 'md') {
                const a = splitParagraphs(seg.text).length;
                const b = splitParagraphs(zseg.text).length;
                if (a !== b) warn(`${zhWhere} (section "${zhSecs[i].heading}")`, `${b} paragraphs vs ${a} in English, so Combined mode pairs the whole section instead of paragraph by paragraph`);
                return;
              }
              if (seg.type !== 'block' || zseg.type !== 'block') return;
              const base = BLOCK_CHECKS[seg.kind](seg.source).data;
              checkZhOverlay(seg.kind, zseg.source, base).errors.forEach(m => err(`${zhWhere} (section "${zhSecs[i].heading}")`, m));
            }),
          );
        }
      }
    }
  }

  if (pythonJobs.length) {
    if (process.env.SKIP_PYTHON === '1') {
      warn('python', `skipped ${pythonJobs.length} python-exercise solution(s) because SKIP_PYTHON=1`);
    } else {
      const tmp = mkdtempSync(join(tmpdir(), 'dsprep-validate-'));
      try {
        pythonJobs.forEach((job, i) => {
          const path = join(tmp, `job_${i}.py`);
          writeFileSync(path, job.code);
          try {
            execFileSync('python3', [path], { stdio: 'pipe', timeout: 30_000 });
          } catch (e) {
            const ex = e as { code?: string; stderr?: Buffer; message: string };
            if (ex.code === 'ENOENT') err('python', 'python3 not found. Install Python 3 with numpy/pandas or set SKIP_PYTHON=1.');
            else err(job.where, `python-exercise solution fails its tests:\n${(ex.stderr?.toString() || ex.message).trim().split('\n').slice(-4).join('\n')}`);
          }
        });
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  }

  const planned = [...sectionOf.keys()].filter(id => !found.has(id)).length;
  console.log(`Lessons written: ${found.size} (Chinese: ${zhCount}) · planned (no file yet): ${planned} · python solutions run: ${process.env.SKIP_PYTHON === '1' ? 0 : pythonJobs.length}`);
  finish();
}

function finish() {
  warnings.forEach(w => console.warn(`⚠ ${w}`));
  errors.forEach(e => console.error(`✗ ${e}`));
  if (errors.length) {
    console.error(`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(`✓ Content valid${warnings.length ? ` (${warnings.length} warning(s))` : ''}.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
