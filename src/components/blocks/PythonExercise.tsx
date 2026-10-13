import { useEffect, useState } from 'react';
import type { ExerciseZh, PythonExerciseData } from '../../content/types';
import type { LessonLang } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/useI18n';
import { useProgress } from '../../progress/useProgress';
import { getPythonRunner, PYTHON_TIMEOUT_MS, type PythonResult } from '../../runtimes/pythonRunner';
import { useToast } from '../Toast';
import { CodeBlock } from '../lesson/CodeBlock';
import { Bi } from './Bilingual';
import { BlockFrame, Feedback } from './BlockFrame';
import { CodeEditor } from './CodeEditor';
import { Hints } from './SqlExercise';

type Output = { mode: 'run' | 'check'; result: PythonResult };

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('\n\n');

interface Props {
  data: PythonExerciseData;
  zh?: ExerciseZh;
  mode?: LessonLang;
  lessonId: string;
}

export function PythonExercise({ data, zh, mode = 'en', lessonId }: Props) {
  const { progress, recordExercise } = useProgress();
  const { t } = useI18n();
  const toast = useToast();
  const saved = progress.get(lessonId)?.exercises[data.id];
  const [code, setCode] = useState(saved?.lastCode || data.starterCode);
  const [running, setRunning] = useState(false);
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const hints = data.hints ?? [];

  useEffect(() => getPythonRunner().onLoadingChange(setLoadingRuntime), []);

  const onChange = (v: string) => {
    setCode(v);
    recordExercise(lessonId, data.id, { code: v });
  };

  const exec = async (runMode: 'run' | 'check') => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    const source = runMode === 'run' ? join(data.setup, code) : join(data.setup, code, data.tests);
    const result = await getPythonRunner().run(source, data.packages ?? []);
    setOutput({ mode: runMode, result });
    setRunning(false);
    if (runMode === 'check' && result.ok) {
      recordExercise(lessonId, data.id, { passed: true });
      toast(t('py.toastPassed'));
    }
  };

  const r = output?.result;
  const printed = r ? (r.stdout + r.stderr).trim() : '';
  const interrupted = r && (r.timedOut || r.stopped || r.loadFailed);
  const interruptMsg = r?.timedOut ? t('py.timedOut', { s: PYTHON_TIMEOUT_MS / 1000 }) : r?.loadFailed ? t('py.loadFailed') : t('py.stopped');

  return (
    <BlockFrame
      label={t('py.label')}
      aside={
        <span className="flex items-center gap-2">
          {saved?.passed && <span className="badge bg-success-soft text-success">{t('ex.passedBadge')}</span>}
          <span className="badge bg-warning-soft text-warning">{t('py.badge')}</span>
        </span>
      }
    >
      <Bi mode={mode} en={data.prompt} zh={zh?.prompt} block />
      <CodeEditor id={`py-${lessonId}-${data.id}`} language="python" value={code} onChange={onChange} onRun={() => exec('run')} label={t('py.editor')} />
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <button className="btn btn-sm border-error text-error" onClick={() => getPythonRunner().stop()}>{t('py.stop')}</button>
        ) : (
          <button className="btn btn-sm" onClick={() => exec('run')}>{t('ex.run')}</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => exec('check')} disabled={running}>{t('ex.check')}</button>
        {hints.length > 0 && (
          <button className="btn btn-sm" onClick={() => setHintCount(n => Math.min(n + 1, hints.length))} disabled={hintCount >= hints.length}>
            {t(hintCount === 0 ? 'ex.hint' : hintCount < hints.length ? 'ex.nextHint' : 'ex.noMoreHints')}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => setShowSolution(s => !s)}>{t(showSolution ? 'ex.hideSolution' : 'ex.showSolution')}</button>
        <button className="btn btn-sm" onClick={() => { setCode(data.starterCode); setOutput(null); recordExercise(lessonId, data.id, { code: data.starterCode }); }}>
          {t('ex.resetCode')}
        </button>
        {running && <span className="text-[13px] text-muted" role="status">{t(loadingRuntime ? 'py.loadingRuntime' : 'ex.running')}</span>}
      </div>
      <Hints en={hints} zh={zh?.hints} count={hintCount} mode={mode} />
      {showSolution && (
        <div className="grid gap-2">
          <CodeBlock code={data.solution} language="python" />
          <div><button className="btn btn-sm" onClick={() => onChange(data.solution)}>{t('ex.copyIntoEditor')}</button></div>
        </div>
      )}
      {interrupted && <Feedback tone="bad"><b>{interruptMsg}</b></Feedback>}
      {output?.mode === 'check' && r && !interrupted && (
        <Feedback tone={r.ok ? 'ok' : 'bad'}><b>{t(r.ok ? 'py.allPassed' : 'py.testsFailed')}</b></Feedback>
      )}
      {r && !interrupted && (printed || r.error) && (
        <pre className="code-block max-h-[320px] whitespace-pre-wrap text-[13px]">
          {printed}
          {r.error && <span className="text-error">{(printed ? '\n' : '') + r.error}</span>}
        </pre>
      )}
      {output?.mode === 'run' && r?.ok && !printed && <p className="text-[13px] text-muted">{t('py.noOutput')}</p>}
    </BlockFrame>
  );
}
