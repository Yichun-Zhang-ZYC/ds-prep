/** Pure helpers shared by the browser runner and scripts/validate-content.ts. */

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
}

interface ExecResult {
  columns: string[];
  values: unknown[][];
}

/** sql.js returns one result per statement that produced rows; the last one is the answer. */
export function lastResult(results: ExecResult[]): QueryResult {
  const last = results[results.length - 1];
  return last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] };
}

const normalize = (v: unknown): unknown => {
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6;
  if (typeof v === 'bigint') return Number(v);
  return v;
};

const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalize));

export interface CompareOutcome {
  ok: boolean;
  /** Learner-facing explanation when ok is false. */
  reason?: string;
}

/**
 * DESIGN.md §6.3: compare column count + rows, order-insensitive unless orderMatters.
 * Column names are ignored (aliases differ legitimately); floats compare to 6 decimals.
 */
export function compareResults(actual: QueryResult, expected: QueryResult, orderMatters = false): CompareOutcome {
  if (actual.columns.length !== expected.columns.length)
    return { ok: false, reason: `Your query returns ${actual.columns.length} column${actual.columns.length === 1 ? '' : 's'}, expected ${expected.columns.length} (${expected.columns.join(', ')}).` };
  if (actual.rows.length !== expected.rows.length)
    return { ok: false, reason: `Your query returns ${actual.rows.length} row${actual.rows.length === 1 ? '' : 's'}, expected ${expected.rows.length}.` };
  const a = actual.rows.map(rowKey);
  const e = expected.rows.map(rowKey);
  if (!orderMatters) {
    a.sort();
    e.sort();
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i])
      return {
        ok: false,
        reason: orderMatters ? 'Same number of rows, but the values or their order differ from the expected result.' : 'Same number of rows, but some values differ from the expected result.',
      };
  }
  return { ok: true };
}
