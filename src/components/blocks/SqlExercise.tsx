import { useCallback, useState } from 'react';
import type { ExerciseZh, SqlExerciseData } from '../../content/types';
import type { LessonLang } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/useI18n';
import { useProgress } from '../../progress/useProgress';
import { checkQuery, runQuery } from '../../runtimes/sqlRunner';
import type { CompareOutcome, QueryResult } from '../../runtimes/sqlCompare';
import { useToast } from '../Toast';
import { CodeBlock } from '../lesson/CodeBlock';
import { Bi } from './Bilingual';
import { BlockFrame, Feedback } from './BlockFrame';
import { CodeEditor } from './CodeEditor';

const MAX_ROWS = 100;

type Output =
  | { kind: 'result'; result: QueryResult }
  | { kind: 'error'; message: string }
  | { kind: 'check'; ok: boolean; reason?: CompareOutcome['reason']; result: QueryResult };

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
  const { t } = useI18n();
  if (!result.columns.length) return <p className="text-[13px] text-muted">{t('sql.noRows')}</p>;
  const rows = result.rows.slice(0, MAX_ROWS);
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] tabular-nums text-muted">
        {t(result.rows.length === 1 ? 'sql.row1' : 'sql.rows', { n: result.rows.length })}
        {result.rows.length > MAX_ROWS && t('sql.showingFirst', { n: MAX_ROWS })}
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

/** Hints shown one at a time; Combined mode shows each hint in both languages. */
export function Hints({ en, zh, count, mode }: { en: string[]; zh?: string[]; count: number; mode: LessonLang }) {
  const { t } = useI18n();
  return (
    <>
      {en.slice(0, count).map((h, i) => (
        <Feedback key={i} tone="info">
          <b>{t('ex.hintN', { n: i + 1 })}</b> <Bi mode={mode} en={h} zh={zh?.[i]} />
        </Feedback>
      ))}
    </>
  );
}

interface Props {
  data: SqlExerciseData;
  zh?: ExerciseZh;
  mode?: LessonLang;
  lessonId: string;
}

export function SqlExercise({ data, zh, mode = 'en', lessonId }: Props) {
  const { progress, recordExercise } = useProgress();
  const { t } = useI18n();
  const toast = useToast();
  const saved = progress.get(lessonId)?.exercises[data.id];
  const [code, setCode] = useState(saved?.lastCode || data.starterCode);
  const [busy, setBusy] = useState(false);
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
      setBusy(true);
      try {
        if (mode === 'run') {
          setOutput({ kind: 'result', result: await runQuery(data.setup, code) });
        } else {
          const out = await checkQuery(data.setup, code, data.solution, data.orderMatters);
          setOutput({ kind: 'check', ok: out.ok, reason: out.reason, result: out.result });
          if (out.ok) {
            recordExercise(lessonId, data.id, { passed: true });
            toast(t('sql.toastPassed'));
          }
        }
      } catch (e) {
        setOutput({ kind: 'error', message: (e as Error).message });
      } finally {
        setBusy(false);
      }
    },
    [busy, code, data, lessonId, recordExercise, toast, t],
  );

  return (
    <BlockFrame
      label={t('sql.label')}
      aside={
        <span className="flex items-center gap-2">
          {saved?.passed && <span className="badge bg-success-soft text-success">{t('ex.passedBadge')}</span>}
          <span className="badge bg-accent-soft text-accent">{t('sql.badge')}</span>
        </span>
      }
    >
      <Bi mode={mode} en={data.prompt} zh={zh?.prompt} block />
      {tables.length > 0 && (
        <p className="text-[13px] text-muted">
          {t('sql.tables')} {tables.map((tbl, i) => <code key={i} className="mr-2 rounded bg-surface-2 px-1 font-mono text-[12px]">{tbl}</code>)}
        </p>
      )}
      <CodeEditor id={`sql-${lessonId}-${data.id}`} language="sql" value={code} onChange={onChange} onRun={() => exec('run')} label={t('sql.editor')} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" onClick={() => exec('run')} disabled={busy}>{t('ex.run')}</button>
        <button className="btn btn-primary btn-sm" onClick={() => exec('check')} disabled={busy}>{t('ex.check')}</button>
        {hints.length > 0 && (
          <button className="btn btn-sm" onClick={() => setHintCount(n => Math.min(n + 1, hints.length))} disabled={hintCount >= hints.length}>
            {t(hintCount === 0 ? 'ex.hint' : hintCount < hints.length ? 'ex.nextHint' : 'ex.noMoreHints')}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => setShowSolution(s => !s)}>{t(showSolution ? 'ex.hideSolution' : 'ex.showSolution')}</button>
        <button className="btn btn-sm" onClick={() => { setCode(data.starterCode); setOutput(null); recordExercise(lessonId, data.id, { code: data.starterCode }); }}>
          {t('ex.resetCode')}
        </button>
        {busy && <span className="text-[13px] text-muted" role="status">{t('ex.running')}</span>}
      </div>
      <Hints en={hints} zh={zh?.hints} count={hintCount} mode={mode} />
      {showSolution && (
        <div className="grid gap-2">
          <CodeBlock code={data.solution} language="sql" />
          <div><button className="btn btn-sm" onClick={() => onChange(data.solution)}>{t('ex.copyIntoEditor')}</button></div>
        </div>
      )}
      {output?.kind === 'error' && <Feedback tone="bad"><b>{t('sql.error')}</b> <span className="font-mono text-[13px]">{output.message}</span></Feedback>}
      {output?.kind === 'result' && <ResultTable result={output.result} />}
      {output?.kind === 'check' && (
        <>
          <Feedback tone={output.ok ? 'ok' : 'bad'}>
            {output.ok ? <b>{t('sql.passed')}</b> : <><b>{t('sql.notYet')}</b> {output.reason && t(output.reason.key, output.reason.vars)}</>}
          </Feedback>
          <ResultTable result={output.result} />
        </>
      )}
    </BlockFrame>
  );
}
