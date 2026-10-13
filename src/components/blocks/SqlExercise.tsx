import { useCallback, useState } from 'react';
import type { SqlExerciseData } from '../../content/types';
import { useProgress } from '../../progress/useProgress';
import { checkQuery, runQuery } from '../../runtimes/sqlRunner';
import type { QueryResult } from '../../runtimes/sqlCompare';
import { useToast } from '../Toast';
import { BlockMarkdown } from '../lesson/InlineMarkdown';
import { CodeBlock } from '../lesson/CodeBlock';
import { BlockFrame, Feedback } from './BlockFrame';
import { CodeEditor } from './CodeEditor';

const MAX_ROWS = 100;

type Output =
  | { kind: 'result'; result: QueryResult; ms: number }
  | { kind: 'error'; message: string }
  | { kind: 'check'; ok: boolean; reason?: string; result: QueryResult };

/** Tables created by the setup script, shown so learners know what they can query. */
function tablesFromSetup(setup: string): string[] {
  return [...setup.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([^;]*?)\)\s*;/gi)].map(m => {
    const cols = m[2]
      .split(',')
      .map(c => c.trim().split(/\s+/)[0])
      .filter(c => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(c));
    return `${m[1]}(${cols.join(', ')})`;
  });
}

export function ResultTable({ result }: { result: QueryResult }) {
  if (!result.columns.length) return <p className="text-[13px] text-muted">Query ran. No rows returned.</p>;
  const rows = result.rows.slice(0, MAX_ROWS);
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] tabular-nums text-muted">
        {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
        {result.rows.length > MAX_ROWS && `, showing first ${MAX_ROWS}`}
      </span>
      <div className="max-h-[360px] overflow-auto rounded-btn border border-border">
        <table className="result-table">
          <thead>
            <tr>{result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <span className="text-muted">NULL</span> : String(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SqlExercise({ data, lessonId }: { data: SqlExerciseData; lessonId: string }) {
  const { progress, recordExercise } = useProgress();
  const toast = useToast();
  const saved = progress.get(lessonId)?.exercises[data.id];
  const [code, setCode] = useState(saved?.lastCode || data.starterCode);
  const [busy, setBusy] = useState<null | 'loading' | 'running'>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const hints = data.hints ?? [];
  const tables = tablesFromSetup(data.setup);

  const onChange = (v: string) => {
    setCode(v);
    recordExercise(lessonId, data.id, { code: v });
  };

  const exec = useCallback(
    async (mode: 'run' | 'check') => {
      if (busy) return;
      setBusy('loading');
      const t0 = performance.now();
      try {
        if (mode === 'run') {
          const result = await runQuery(data.setup, code);
          setOutput({ kind: 'result', result, ms: Math.round(performance.now() - t0) });
        } else {
          const out = await checkQuery(data.setup, code, data.solution, data.orderMatters);
          setOutput({ kind: 'check', ok: out.ok, reason: out.reason, result: out.result });
          if (out.ok) {
            recordExercise(lessonId, data.id, { passed: true });
            toast('Exercise passed. Mark the lesson complete when you’re ready.');
          }
        }
      } catch (e) {
        setOutput({ kind: 'error', message: (e as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [busy, code, data, lessonId, recordExercise, toast],
  );

  return (
    <BlockFrame
      label="SQL exercise"
      aside={
        <span className="flex items-center gap-2">
          {saved?.passed && <span className="badge bg-success-soft text-success">✓ Passed</span>}
          <span className="badge bg-accent-soft text-accent">SQLite in your browser</span>
        </span>
      }
    >
      <BlockMarkdown text={data.prompt} />
      {tables.length > 0 && (
        <p className="text-[13px] text-muted">
          Tables: {tables.map((t, i) => <code key={i} className="mr-2 rounded bg-surface-2 px-1 font-mono text-[12px]">{t}</code>)}
        </p>
      )}
      <CodeEditor id={`sql-${lessonId}-${data.id}`} language="sql" value={code} onChange={onChange} onRun={() => exec('run')} label="SQL editor" />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" onClick={() => exec('run')} disabled={!!busy}>▶ Run</button>
        <button className="btn btn-primary btn-sm" onClick={() => exec('check')} disabled={!!busy}>Check</button>
        {hints.length > 0 && (
          <button className="btn btn-sm" onClick={() => setHintCount(n => Math.min(n + 1, hints.length))} disabled={hintCount >= hints.length}>
            {hintCount === 0 ? 'Hint' : hintCount < hints.length ? 'Next hint' : 'No more hints'}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => setShowSolution(s => !s)}>{showSolution ? 'Hide solution' : 'Show solution'}</button>
        <button className="btn btn-sm" onClick={() => { setCode(data.starterCode); setOutput(null); recordExercise(lessonId, data.id, { code: data.starterCode }); }}>
          Reset code
        </button>
        {busy && <span className="text-[13px] text-muted" role="status">Running…</span>}
      </div>
      {hints.slice(0, hintCount).map((h, i) => (
        <Feedback key={i} tone="info"><b>Hint {i + 1}:</b> {h}</Feedback>
      ))}
      {showSolution && (
        <div className="grid gap-2">
          <CodeBlock code={data.solution} language="sql" />
          <div><button className="btn btn-sm" onClick={() => onChange(data.solution)}>Copy into editor</button></div>
        </div>
      )}
      {output?.kind === 'error' && <Feedback tone="bad"><b>SQL error:</b> <span className="font-mono text-[13px]">{output.message}</span></Feedback>}
      {output?.kind === 'result' && <ResultTable result={output.result} />}
      {output?.kind === 'check' && (
        <>
          <Feedback tone={output.ok ? 'ok' : 'bad'}>
            {output.ok ? <><b>✓ Passed.</b> Your result matches the expected output.</> : <><b>Not yet.</b> {output.reason}</>}
          </Feedback>
          <ResultTable result={output.result} />
        </>
      )}
    </BlockFrame>
  );
}
