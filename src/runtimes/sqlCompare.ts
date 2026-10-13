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
  /** i18n key + variables explaining the mismatch (see "sql.cmp.*" in src/i18n/strings.ts). */
  reason?: { key: string; vars?: Record<string, string | number> };
}

/**
 * DESIGN.md §6.3: compare column count + rows, order-insensitive unless orderMatters.
 * Column names are ignored (aliases differ legitimately); floats compare to 6 decimals.
 */
export function compareResults(actual: QueryResult, expected: QueryResult, orderMatters = false): CompareOutcome {
  if (actual.columns.length !== expected.columns.length)
    return { ok: false, reason: { key: 'sql.cmp.cols', vars: { got: actual.columns.length, want: expected.columns.length, names: expected.columns.join(', ') } } };
  if (actual.rows.length !== expected.rows.length)
    return { ok: false, reason: { key: 'sql.cmp.rows', vars: { got: actual.rows.length, want: expected.rows.length } } };
  const a = actual.rows.map(rowKey);
  const e = expected.rows.map(rowKey);
  if (!orderMatters) {
    a.sort();
    e.sort();
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i]) return { ok: false, reason: { key: orderMatters ? 'sql.cmp.order' : 'sql.cmp.values' } };
  }
  return { ok: true };
}
