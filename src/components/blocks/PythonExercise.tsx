import { useEffect, useState } from 'react';
import type { PythonExerciseData } from '../../content/types';
import { useProgress } from '../../progress/useProgress';
import { getPythonRunner, type PythonResult } from '../../runtimes/pythonRunner';
import { useToast } from '../Toast';
import { BlockMarkdown } from '../lesson/InlineMarkdown';
import { CodeBlock } from '../lesson/CodeBlock';
import { BlockFrame, Feedback } from './BlockFrame';
import { CodeEditor } from './CodeEditor';

type Output = { mode: 'run' | 'check'; result: PythonResult };

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join('\n\n');

export function PythonExercise({ data, lessonId }: { data: PythonExerciseData; lessonId: string }) {
  const { progress, recordExercise } = useProgress();
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

  const exec = async (mode: 'run' | 'check') => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    const source = mode === 'run' ? join(data.setup, code) : join(data.setup, code, data.tests);
    const result = await getPythonRunner().run(source, data.packages ?? []);
    setOutput({ mode, result });
    setRunning(false);
    if (mode === 'check' && result.ok) {
      recordExercise(lessonId, data.id, { passed: true });
      toast('All tests passed. Mark the lesson complete when you’re ready.');
    }
  };

  const r = output?.result;
  const printed = r ? (r.stdout + r.stderr).trim() : '';

  return (
    <BlockFrame
      label="Python exercise"
      aside={
        <span className="flex items-center gap-2">
          {saved?.passed && <span className="badge bg-success-soft text-success">✓ Passed</span>}
          <span className="badge bg-warning-soft text-warning">Python in your browser</span>
        </span>
      }
    >
      <BlockMarkdown text={data.prompt} />
      <CodeEditor id={`py-${lessonId}-${data.id}`} language="python" value={code} onChange={onChange} onRun={() => exec('run')} label="Python editor" />
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <button className="btn btn-sm border-error text-error" onClick={() => getPythonRunner().stop()}>■ Stop</button>
        ) : (
          <button className="btn btn-sm" onClick={() => exec('run')}>▶ Run</button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => exec('check')} disabled={running}>Check</button>
        {hints.length > 0 && (
          <button className="btn btn-sm" onClick={() => setHintCount(n => Math.min(n + 1, hints.length))} disabled={hintCount >= hints.length}>
            {hintCount === 0 ? 'Hint' : hintCount < hints.length ? 'Next hint' : 'No more hints'}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => setShowSolution(s => !s)}>{showSolution ? 'Hide solution' : 'Show solution'}</button>
        <button className="btn btn-sm" onClick={() => { setCode(data.starterCode); setOutput(null); recordExercise(lessonId, data.id, { code: data.starterCode }); }}>
          Reset code
        </button>
        {running && (
          <span className="text-[13px] text-muted" role="status">
            {loadingRuntime ? 'Loading Python runtime (~10s the first time)…' : 'Running…'}
          </span>
        )}
      </div>
      {hints.slice(0, hintCount).map((h, i) => (
        <Feedback key={i} tone="info"><b>Hint {i + 1}:</b> {h}</Feedback>
      ))}
      {showSolution && (
        <div className="grid gap-2">
          <CodeBlock code={data.solution} language="python" />
          <div><button className="btn btn-sm" onClick={() => onChange(data.solution)}>Copy into editor</button></div>
        </div>
      )}
      {output?.mode === 'check' && r && (
        <Feedback tone={r.ok ? 'ok' : 'bad'}>
          {r.ok ? <><b>✓ All tests passed.</b></> : r.timedOut || r.stopped ? <b>{r.error}</b> : <><b>Tests failed.</b> See the error below.</>}
        </Feedback>
      )}
      {output?.mode === 'run' && r && (r.timedOut || r.stopped) && <Feedback tone="bad"><b>{r.error}</b></Feedback>}
      {r && (printed || (r.error && !r.timedOut && !r.stopped)) && (
        <pre className="code-block max-h-[320px] whitespace-pre-wrap text-[13px]">
          {printed}
          {r.error && !r.timedOut && !r.stopped && <span className="text-error">{(printed ? '\n' : '') + r.error}</span>}
        </pre>
      )}
      {output?.mode === 'run' && r?.ok && !printed && <p className="text-[13px] text-muted">Ran without output. Use print() to see values.</p>}
    </BlockFrame>
  );
}
