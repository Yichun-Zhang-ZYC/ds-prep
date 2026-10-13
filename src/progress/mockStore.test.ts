import { createMockStore } from './mockStore';
import type { ProgressMap } from './types';

describe('mockStore', () => {
  it('merges quiz and exercise entries without clobbering', async () => {
    const store = createMockStore('t', undefined, { persist: false });
    let latest: ProgressMap = new Map();
    store.subscribeProgress(m => (latest = m), () => {});
    await store.writeProgress('l1', { status: 'visited', quiz: { q1: { correct: false, attempts: 1 } } });
    await store.writeProgress('l1', { quiz: { q2: { correct: true, attempts: 1 } } });
    await store.writeProgress('l1', { exercises: { ex1: { lastCode: 'SELECT 1' } } });
    await store.writeProgress('l1', { exercises: { ex1: { passed: true } } });
    const p = latest.get('l1')!;
    expect(Object.keys(p.quiz)).toEqual(['q1', 'q2']);
    expect(p.exercises.ex1).toEqual({ passed: true, lastCode: 'SELECT 1' });
  });

  it('marks and un-marks completion', async () => {
    const store = createMockStore('t2', undefined, { persist: false });
    let latest: ProgressMap = new Map();
    store.subscribeProgress(m => (latest = m), () => {});
    await store.writeProgress('l1', { status: 'completed', completedAt: 123 });
    expect(latest.get('l1')).toMatchObject({ status: 'completed', completedAt: 123 });
    await store.writeProgress('l1', { status: 'visited', completedAt: null });
    expect(latest.get('l1')).toMatchObject({ status: 'visited', completedAt: null });
    await store.resetProgress();
    expect(latest.size).toBe(0);
  });
});
