import { compareResults } from './sqlCompare';

const r = (columns: string[], rows: unknown[][]) => ({ columns, rows });

describe('compareResults', () => {
  it('ignores row order unless orderMatters', () => {
    const a = r(['x'], [[1], [2]]);
    const b = r(['x'], [[2], [1]]);
    expect(compareResults(a, b).ok).toBe(true);
    expect(compareResults(a, b, true).ok).toBe(false);
  });
  it('ignores column names but checks column count', () => {
    expect(compareResults(r(['total'], [[1]]), r(['sum'], [[1]])).ok).toBe(true);
    expect(compareResults(r(['a', 'b'], [[1, 2]]), r(['a'], [[1]])).reason).toMatch(/2 columns, expected 1/);
  });
  it('compares floats to 6 decimals', () => {
    expect(compareResults(r(['x'], [[0.1 + 0.2]]), r(['x'], [[0.3]])).ok).toBe(true);
  });
  it('reports row count mismatches', () => {
    expect(compareResults(r(['x'], [[1]]), r(['x'], [[1], [2]])).reason).toMatch(/1 row, expected 2/);
  });
});
