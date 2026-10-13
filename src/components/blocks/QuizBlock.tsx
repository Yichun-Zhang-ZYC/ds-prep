import { useId, useState } from 'react';
import type { QuizBlockData, QuizZh } from '../../content/types';
import type { LessonLang } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/useI18n';
import { useProgress } from '../../progress/useProgress';
import { Bi } from './Bilingual';
import { BlockFrame, Feedback } from './BlockFrame';

const sameSet = (a: number[], b: number[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

interface Props {
  data: QuizBlockData;
  zh?: QuizZh;
  mode?: LessonLang;
  lessonId: string;
}

/** Single or multi-answer question; real radio / checkbox inputs (DESIGN.md §9 accessibility). */
export function QuizBlock({ data, zh, mode = 'en', lessonId }: Props) {
  const multi = data.type === 'multi';
  const name = useId();
  const { t } = useI18n();
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
      label={t(multi ? 'quiz.labelMulti' : 'quiz.label')}
      aside={
        attempts > 0 && (
          <span className="text-[13px] text-muted">
            {record?.correct ? t('quiz.answered') : ''}
            {t(attempts === 1 ? 'quiz.attempt1' : 'quiz.attempts', { n: attempts })}
          </span>
        )
      }
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold leading-normal">
          <Bi mode={mode} en={data.question} zh={zh?.question} />
        </legend>
        {data.options.map((opt, i) => {
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
                checked={selected.includes(i)}
                onChange={() => toggle(i)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <Bi mode={mode} en={opt} zh={zh?.options?.[i]} />
              {state === 'right' && <span className="ml-auto text-success" aria-label={t('quiz.correctMark')}>✓</span>}
              {state === 'wrong' && <span className="ml-auto text-error" aria-label={t('quiz.wrongMark')}>✗</span>}
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm" onClick={check} disabled={!selected.length}>
          {t('quiz.check')}
        </button>
        {checked && !checked.correct && (
          <button className="btn btn-sm" onClick={() => { setChecked(null); setSelected([]); }}>
            {t('quiz.retry')}
          </button>
        )}
      </div>
      {checked && (
        <Feedback tone={checked.correct ? 'ok' : 'bad'}>
          <b>{t(checked.correct ? 'quiz.correct' : multi ? 'quiz.wrongMulti' : 'quiz.wrong')}</b>
          {checked.correct && data.explanation && <Bi mode={mode} en={data.explanation} zh={zh?.explanation} />}
        </Feedback>
      )}
    </BlockFrame>
  );
}
