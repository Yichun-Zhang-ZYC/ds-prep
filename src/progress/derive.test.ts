import type { Lesson } from '../content/types';
import { continueTarget, formatMinutes, neighbors, stats } from './derive';
import type { LessonProgress, ProgressMap } from './types';

const lesson = (id: string, available = true, estimatedMinutes = 10): Lesson => ({
  id, sectionId: 's', subtopicId: 'st', title: id, hasZh: false, available, estimatedMinutes, blocks: [],
});
const done = (): LessonProgress => ({ status: 'completed', completedAt: 1, firstVisitedAt: 1, quiz: {}, exercises: {}, updatedAt: 1 });
const visited = (): LessonProgress => ({ ...done(), status: 'visited', completedAt: null });

const order = [lesson('a'), lesson('b'), lesson('c')];

describe('stats', () => {
  it('counts only available lessons and ignores orphaned progress', () => {
    const progress: ProgressMap = new Map([['a', done()], ['zzz-removed', done()]]);
    const s = stats([...order, lesson('planned', false)], progress);
    expect(s).toMatchObject({ completed: 1, total: 3, pct: 33, minutesLeft: 20, planned: 1, state: 'in-progress' });
  });

  it('reports coming-soon and completed states', () => {
    expect(stats([lesson('x', false)], new Map()).state).toBe('coming-soon');
    expect(stats([lesson('a')], new Map([['a', done()]])).state).toBe('completed');
    expect(stats([lesson('a')], new Map()).state).toBe('not-started');
  });
});

describe('continueTarget', () => {
  it('returns lastLessonId while it is not completed', () => {
    expect(continueTarget(order, new Map([['b', visited()]]), 'b')?.id).toBe('b');
  });
  it('moves to the first incomplete lesson after a completed last lesson', () => {
    expect(continueTarget(order, new Map([['b', done()]]), 'b')?.id).toBe('c');
  });
  it('wraps to earlier incomplete lessons', () => {
    expect(continueTarget(order, new Map([['b', done()], ['c', done()]]), 'c')?.id).toBe('a');
  });
  it('returns null when everything is done', () => {
    expect(continueTarget(order, new Map(order.map(l => [l.id, done()])), 'a')).toBeNull();
  });
});

describe('neighbors / formatMinutes', () => {
  it('finds prev and next in global order', () => {
    expect(neighbors(order, 'a')).toEqual({ prev: null, next: order[1] });
    expect(neighbors(order, 'c').next).toBeNull();
  });
  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(95)).toBe('1h 35m');
  });
});
