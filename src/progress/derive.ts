import type { Lesson } from '../content/types';
import type { ProgressMap } from './types';

export type DisplayStatus = 'none' | 'visited' | 'completed';

export function lessonStatus(progress: ProgressMap, lessonId: string): DisplayStatus {
  return progress.get(lessonId)?.status ?? 'none';
}

export const isCompleted = (progress: ProgressMap, lessonId: string) => progress.get(lessonId)?.status === 'completed';

export interface Stats {
  completed: number;
  total: number;
  /** 0–100, rounded down so 99.6% never shows as 100%. */
  pct: number;
  minutesLeft: number;
  /** Planned lessons without a file yet. Not counted in total. */
  planned: number;
  state: 'not-started' | 'in-progress' | 'completed' | 'coming-soon';
}

/** Progress over the available lessons in a list (orphaned progress docs are ignored). */
export function stats(lessons: Lesson[], progress: ProgressMap): Stats {
  const available = lessons.filter(l => l.available);
  const completed = available.filter(l => isCompleted(progress, l.id)).length;
  const touched = available.some(l => progress.has(l.id));
  const total = available.length;
  const minutesLeft = available.filter(l => !isCompleted(progress, l.id)).reduce((a, l) => a + l.estimatedMinutes, 0);
  const state: Stats['state'] =
    total === 0 ? 'coming-soon' : completed === total ? 'completed' : touched ? 'in-progress' : 'not-started';
  return {
    completed,
    total,
    pct: total ? Math.floor((completed / total) * 100) : 0,
    minutesLeft,
    planned: lessons.length - total,
    state,
  };
}

/**
 * Continue target (DESIGN.md §7): lastLessonId if not completed, otherwise the
 * first incomplete lesson after it in global order (wrapping to the start).
 */
export function continueTarget(order: Lesson[], progress: ProgressMap, lastLessonId: string | null): Lesson | null {
  const lastIdx = lastLessonId ? order.findIndex(l => l.id === lastLessonId) : -1;
  if (lastIdx >= 0 && !isCompleted(progress, order[lastIdx].id)) return order[lastIdx];
  const after = order.slice(lastIdx + 1).find(l => !isCompleted(progress, l.id));
  return after ?? order.find(l => !isCompleted(progress, l.id)) ?? null;
}

export function neighbors(order: Lesson[], lessonId: string): { prev: Lesson | null; next: Lesson | null } {
  const i = order.findIndex(l => l.id === lessonId);
  if (i < 0) return { prev: null, next: null };
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null };
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
