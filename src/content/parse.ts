/**
 * Pure parsing + schema checks shared by the browser app, the Vite content plugin
 * and scripts/validate-content.ts. Must stay free of DOM and Node-only APIs.
 */
import { parse as parseYaml } from 'yaml';
import type {
  BlockKind,
  LessonFrontmatter,
  PythonExerciseData,
  QuizBlockData,
  RevealBlockData,
  SqlExerciseData,
} from './types.ts';
import { BLOCK_KINDS } from './types.ts';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.match(FM_RE);
  if (!m) return { data: {}, body: raw };
  const data = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  return { data, body: raw.slice(m[0].length) };
}

export function checkFrontmatter(data: Record<string, unknown>): { fm?: LessonFrontmatter; errors: string[] } {
  const errors: string[] = [];
  if (typeof data.id !== 'string' || !data.id) errors.push('frontmatter: "id" is required');
  if (typeof data.title !== 'string' || !data.title) errors.push('frontmatter: "title" is required');
  if (typeof data.estimatedMinutes !== 'number' || data.estimatedMinutes <= 0)
    errors.push('frontmatter: "estimatedMinutes" must be a positive number');
  if (!['easy', 'medium', 'hard'].includes(data.difficulty as string))
    errors.push('frontmatter: "difficulty" must be easy | medium | hard');
  if (data.tags !== undefined && !(Array.isArray(data.tags) && data.tags.every(t => typeof t === 'string')))
    errors.push('frontmatter: "tags" must be a list of strings');
  if (errors.length) return { errors };
  return {
    errors,
    fm: {
      id: data.id as string,
      title: data.title as string,
      estimatedMinutes: data.estimatedMinutes as number,
      difficulty: data.difficulty as LessonFrontmatter['difficulty'],
      tags: (data.tags as string[] | undefined) ?? [],
    },
  };
}

export interface RawBlock {
  kind: BlockKind;
  source: string;
  /** 1-based line of the opening fence, for error messages. */
  line: number;
}

/** Finds fenced blocks whose info string is an interactive block kind. */
export function extractBlocks(body: string): RawBlock[] {
  const out: RawBlock[] = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(```+|~~~+)\s*([\w-]+)\s*$/);
    if (!open) continue;
    const fence = open[1];
    const kind = open[2] as BlockKind;
    const start = i;
    const buf: string[] = [];
    for (i = i + 1; i < lines.length && !lines[i].startsWith(fence); i++) buf.push(lines[i]);
    if (BLOCK_KINDS.includes(kind)) out.push({ kind, source: buf.join('\n'), line: start + 1 });
  }
  return out;
}

type Check<T> = { data?: T; errors: string[] };

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

function parseJson(source: string): { value?: Record<string, unknown>; error?: string } {
  try {
    const value = JSON.parse(source);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'block body must be a JSON object' };
    return { value };
  } catch (e) {
    return { error: `invalid JSON: ${(e as Error).message}` };
  }
}

export function checkQuiz(source: string): Check<QuizBlockData> {
  const { value: v, error } = parseJson(source);
  if (!v) return { errors: [error!] };
  const errors: string[] = [];
  if (!isStr(v.id)) errors.push('quiz: "id" is required');
  if (!isStr(v.question)) errors.push('quiz: "question" is required');
  if (!isStrArr(v.options) || v.options.length < 2) errors.push('quiz: "options" needs at least 2 strings');
  const n = Array.isArray(v.options) ? v.options.length : 0;
  const inRange = (x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < n;
  if (v.type === 'multi') {
    if (!Array.isArray(v.answer) || v.answer.length === 0 || !v.answer.every(inRange))
      errors.push('quiz: multi "answer" must be a non-empty list of option indexes');
  } else {
    if (v.type !== undefined && v.type !== 'single') errors.push('quiz: "type" must be "single" or "multi"');
    if (!inRange(v.answer)) errors.push('quiz: "answer" must be an option index');
  }
  if (v.explanation !== undefined && typeof v.explanation !== 'string') errors.push('quiz: "explanation" must be a string');
  return errors.length ? { errors } : { errors, data: v as unknown as QuizBlockData };
}

export function checkSqlExercise(source: string): Check<SqlExerciseData> {
  const { value: v, error } = parseJson(source);
  if (!v) return { errors: [error!] };
  const errors: string[] = [];
  for (const k of ['id', 'prompt', 'setup', 'solution'] as const) if (!isStr(v[k])) errors.push(`sql-exercise: "${k}" is required`);
  if (typeof v.starterCode !== 'string') errors.push('sql-exercise: "starterCode" is required');
  if (v.hints !== undefined && !isStrArr(v.hints)) errors.push('sql-exercise: "hints" must be a list of strings');
  if (v.orderMatters !== undefined && typeof v.orderMatters !== 'boolean') errors.push('sql-exercise: "orderMatters" must be boolean');
  return errors.length ? { errors } : { errors, data: v as unknown as SqlExerciseData };
}

export function checkPythonExercise(source: string): Check<PythonExerciseData> {
  const { value: v, error } = parseJson(source);
  if (!v) return { errors: [error!] };
  const errors: string[] = [];
  for (const k of ['id', 'prompt', 'tests', 'solution'] as const) if (!isStr(v[k])) errors.push(`python-exercise: "${k}" is required`);
  if (typeof v.starterCode !== 'string') errors.push('python-exercise: "starterCode" is required');
  if (v.setup !== undefined && typeof v.setup !== 'string') errors.push('python-exercise: "setup" must be a string');
  if (v.packages !== undefined && !isStrArr(v.packages)) errors.push('python-exercise: "packages" must be a list of strings');
  if (v.hints !== undefined && !isStrArr(v.hints)) errors.push('python-exercise: "hints" must be a list of strings');
  return errors.length ? { errors } : { errors, data: v as unknown as PythonExerciseData };
}

export function checkReveal(source: string): Check<RevealBlockData> {
  const { value: v, error } = parseJson(source);
  if (!v) return { errors: [error!] };
  const errors: string[] = [];
  if (!isStr(v.prompt)) errors.push('reveal: "prompt" is required');
  if (!isStr(v.answer)) errors.push('reveal: "answer" is required');
  return errors.length ? { errors } : { errors, data: v as unknown as RevealBlockData };
}

export const BLOCK_CHECKS = {
  quiz: checkQuiz,
  'sql-exercise': checkSqlExercise,
  'python-exercise': checkPythonExercise,
  reveal: checkReveal,
} as const;

/** Metadata for the build-time index; returns errors instead of throwing. */
export function lessonMetaFromFile(raw: string, sectionId: string) {
  const { data, body } = splitFrontmatter(raw);
  const { fm, errors } = checkFrontmatter(data);
  const blocks = [...new Set(extractBlocks(body).map(b => b.kind))];
  return { meta: fm ? { ...fm, sectionId, blocks } : undefined, errors, body };
}
