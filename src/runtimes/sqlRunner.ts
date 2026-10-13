import type { SqlJsStatic } from 'sql.js';
import { compareResults, lastResult, type CompareOutcome, type QueryResult } from './sqlCompare';

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Lazy-loads sql.js + its WASM the first time a SQL exercise runs (DESIGN.md §11). */
export function loadSql(): Promise<SqlJsStatic> {
  sqlPromise ??= Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm-browser.wasm?url')])
    .then(([mod, wasm]) => {
      // sql.js is CommonJS; depending on bundling the init function is the default export or the module itself.
      const init = ((mod as { default?: unknown }).default ?? mod) as typeof mod.default;
      return init({ locateFile: () => wasm.default });
    })
    .catch(e => {
      sqlPromise = null;
      throw e;
    });
  return sqlPromise;
}

async function execOnFreshDb(setup: string, query: string): Promise<QueryResult> {
  const SQL = await loadSql();
  const db = new SQL.Database();
  try {
    db.run(setup);
    return lastResult(db.exec(query));
  } finally {
    db.close();
  }
}

export async function runQuery(setup: string, query: string): Promise<QueryResult> {
  return execOnFreshDb(setup, query);
}

/** Runs the learner's query and the solution on separate fresh databases and compares. */
export async function checkQuery(setup: string, query: string, solution: string, orderMatters = false): Promise<CompareOutcome & { result: QueryResult }> {
  const [result, expected] = await Promise.all([execOnFreshDb(setup, query), execOnFreshDb(setup, solution)]);
  return { ...compareResults(result, expected, orderMatters), result };
}
