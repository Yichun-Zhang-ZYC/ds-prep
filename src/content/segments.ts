/**
 * Splits a lesson body into "## " sections, and each section into Markdown runs and
 * interactive blocks. English and Chinese files of a lesson must have the same shape
 * (same number of sections, same sequence of md/block segments) so they can be shown
 * side by side in Combined mode. Pure: shared by the app and the validator.
 */
import type { BlockKind } from './types.ts';
import { BLOCK_KINDS } from './types.ts';

export type Segment =
  | { type: 'md'; text: string }
  | { type: 'block'; kind: BlockKind; source: string; line: number };

export interface LessonSection {
  /** Text of the "## " heading; null for content before the first heading. */
  heading: string | null;
  segments: Segment[];
}

export function splitLesson(body: string): LessonSection[] {
  const sections: LessonSection[] = [];
  let current: LessonSection = { heading: null, segments: [] };
  let md: string[] = [];
  const lines = body.split('\n');

  const flushMd = () => {
    const text = md.join('\n').trim();
    if (text) current.segments.push({ type: 'md', text });
    md = [];
  };
  const flushSection = () => {
    flushMd();
    if (current.heading !== null || current.segments.length) sections.push(current);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(```+|~~~+)\s*([\w-]*)\s*$/);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2];
      const start = i;
      const inner: string[] = [];
      for (i = i + 1; i < lines.length && !lines[i].startsWith(marker); i++) inner.push(lines[i]);
      if ((BLOCK_KINDS as string[]).includes(lang)) {
        flushMd();
        current.segments.push({ type: 'block', kind: lang as BlockKind, source: inner.join('\n'), line: start + 1 });
      } else {
        // Ordinary code fence: keep it verbatim inside the Markdown run.
        md.push(line, ...inner, lines[i] ?? marker);
      }
      continue;
    }
    const h2 = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) {
      flushSection();
      current = { heading: h2[1], segments: [] };
      continue;
    }
    md.push(line);
  }
  flushSection();
  return sections;
}

const shape = (s: LessonSection) => s.segments.map(seg => (seg.type === 'md' ? 'md' : seg.kind)).join(' → ');

/** Differences between the English and Chinese structure, as learner-agnostic messages. */
export function compareShapes(en: LessonSection[], zh: LessonSection[]): string[] {
  const errors: string[] = [];
  if (en.length !== zh.length) {
    errors.push(`English has ${en.length} "##" sections, Chinese has ${zh.length}`);
    return errors;
  }
  en.forEach((s, i) => {
    if (shape(s) !== shape(zh[i]))
      errors.push(`section ${i + 1} ("${s.heading ?? 'intro'}") differs: English [${shape(s)}] vs Chinese [${shape(zh[i])}]`);
  });
  return errors;
}

/**
 * Splits a Markdown run into top-level chunks separated by blank lines (code fences
 * stay whole). Used to interleave English and Chinese paragraph by paragraph.
 */
export function splitParagraphs(text: string): string[] {
  const chunks: string[] = [];
  let buf: string[] = [];
  let fence: string | null = null;
  const flush = () => {
    const c = buf.join('\n').trim();
    if (c) chunks.push(c);
    buf = [];
  };
  for (const line of text.split('\n')) {
    const m = line.match(/^(```+|~~~+)/);
    if (fence) {
      buf.push(line);
      if (m && line.startsWith(fence)) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      buf.push(line);
      continue;
    }
    if (!line.trim()) flush();
    else buf.push(line);
  }
  flush();
  return chunks;
}

export const isCodeChunk = (chunk: string) => /^(```|~~~)/.test(chunk);
