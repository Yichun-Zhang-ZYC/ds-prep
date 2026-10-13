import { useId, useState } from 'react';
import type { QuizBlockData } from '../../content/types';
import { useProgress } from '../../progress/useProgress';
import { BlockFrame, Feedback } from './BlockFrame';
import { InlineMarkdown } from '../lesson/InlineMarkdown';

const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** Single or multi-answer question; real radio / checkbox inputs (DESIGN.md §9 accessibility). */
export function QuizBlock({ data, lessonId }: { data: QuizBlockData; lessonId: string }) {
  const multi = data.type === 'multi';
  const name = useId();
  const { progress, recordQuiz } = useProgress();
  const record = progress.get(lessonId)?.quiz[data.id];
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState<{ correct: boolean; picks: number[] } | null>(null);
  const answer = Array.isArray(data.answer) ? data.answer : [data.answer];

  const toggle = (i: number) => {
    setChecked(null);
    setSelected(prev => (multi ? (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]) : [i]));
  };

  const check = () => {
    if (!selected.length) return;
    const correct = sameSet(selected, answer);
    setChecked({ correct, picks: selected });
    recordQuiz(lessonId, data.id, correct);
  };

  const attempts = record?.attempts ?? 0;

  return (
    <BlockFrame
      label={multi ? 'Quiz · select all that apply' : 'Quiz'}
      aside={
        attempts > 0 && (
          <span className="text-[13px] text-muted">
            {record?.correct ? '✓ Answered correctly · ' : ''}
            {attempts} attempt{attempts === 1 ? '' : 's'}
          </span>
        )
      }
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold leading-normal">
          <InlineMarkdown text={data.question} />
        </legend>
        {data.options.map((opt, i) => {
          const isPicked = selected.includes(i);
          // Mark only what the learner picked, so a wrong attempt doesn't give the answer away.
          const state = checked?.picks.includes(i) ? (answer.includes(i) ? 'right' : 'wrong') : null;
          return (
            <label
              key={i}
              className={`flex items-center gap-2.5 rounded-btn border px-3 py-2.5 leading-snug hover:bg-surface ${
                state === 'right' ? 'border-success bg-success-soft' : state === 'wrong' ? 'border-error bg-error-soft' : 'border-border'
              }`}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={name}
                checked={isPicked}
                onChange={() => toggle(i)}
                className="size-4 accent-[var(--accent)]"
              />
              <InlineMarkdown text={opt} />
              {state === 'right' && <span className="ml-auto text-success" aria-label="correct">✓</span>}
              {state === 'wrong' && <span className="ml-auto text-error" aria-label="incorrect">✗</span>}
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm" onClick={check} disabled={!selected.length}>
          Check answer
        </button>
        {checked && !checked.correct && (
          <button className="btn btn-sm" onClick={() => { setChecked(null); setSelected([]); }}>
            Try again
          </button>
        )}
      </div>
      {checked && (
        <Feedback tone={checked.correct ? 'ok' : 'bad'}>
          <b>{checked.correct ? 'Correct. ' : multi ? 'Not quite. Check which options you missed or added. ' : 'Not quite. Try again. '}</b>
          {checked.correct && data.explanation && <InlineMarkdown text={data.explanation} />}
        </Feedback>
      )}
    </BlockFrame>
  );
}
