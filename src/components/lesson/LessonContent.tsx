import { memo, useMemo } from 'react';
import { BLOCK_CHECKS, checkZhOverlay } from '../../content/parse';
import { compareShapes, isCodeChunk, splitLesson, splitParagraphs, type Segment } from '../../content/segments';
import type { BlockKind, BlockZh, ExerciseZh, QuizZh, RevealZh } from '../../content/types';
import type { LessonLang } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/useI18n';
import { BlockError } from '../blocks/BlockFrame';
import { PythonExercise } from '../blocks/PythonExercise';
import { QuizBlock } from '../blocks/QuizBlock';
import { RevealBlock } from '../blocks/RevealBlock';
import { SqlExercise } from '../blocks/SqlExercise';
import { InlineMarkdown } from './InlineMarkdown';
import { Md } from './MarkdownRenderer';

/**
 * Combined mode for one Markdown run: English paragraph, then its Chinese paragraph.
 * Identical chunks (code, numeric tables) and code blocks are shown once, in English.
 * If the paragraph counts differ, falls back to the whole English run, then the whole Chinese run.
 */
function PairedMd({ en, zh }: { en: string; zh: string }) {
  const enParas = splitParagraphs(en);
  const zhParas = splitParagraphs(zh);
  if (enParas.length !== zhParas.length)
    return (
      <>
        <Md text={en} />
        <div lang="zh-CN" className="zh-pair"><Md text={zh} /></div>
      </>
    );
  return (
    <>
      {enParas.map((p, k) => {
        const z = zhParas[k];
        const same = p.trim() === z.trim() || (isCodeChunk(p) && isCodeChunk(z));
        return (
          <div key={k} className="contents">
            <Md text={p} />
            {!same && <div lang="zh-CN" className="zh-pair"><Md text={z} /></div>}
          </div>
        );
      })}
    </>
  );
}

function InteractiveBlock({ kind, source, zhSource, mode, lessonId }: { kind: BlockKind; source: string; zhSource?: string; mode: LessonLang; lessonId: string }) {
  const { data, errors } = BLOCK_CHECKS[kind](source);
  if (!data) return <BlockError kind={kind} errors={errors} />;
  // A broken translation falls back to English rather than hiding the exercise.
  const zh: BlockZh | undefined = zhSource ? checkZhOverlay(kind, zhSource, data).data : undefined;
  switch (kind) {
    case 'quiz':
      return <QuizBlock data={data as Parameters<typeof QuizBlock>[0]['data']} zh={zh as QuizZh | undefined} mode={mode} lessonId={lessonId} />;
    case 'sql-exercise':
      return <SqlExercise data={data as Parameters<typeof SqlExercise>[0]['data']} zh={zh as ExerciseZh | undefined} mode={mode} lessonId={lessonId} />;
    case 'python-exercise':
      return <PythonExercise data={data as Parameters<typeof PythonExercise>[0]['data']} zh={zh as ExerciseZh | undefined} mode={mode} lessonId={lessonId} />;
    case 'reveal':
      return <RevealBlock data={data as Parameters<typeof RevealBlock>[0]['data']} zh={zh as RevealZh | undefined} mode={mode} />;
  }
}

interface Props {
  en: string;
  zh: string | null;
  mode: LessonLang;
  lessonId: string;
}

/**
 * Renders a lesson in English, Chinese, or Combined (each English paragraph followed by
 * its Chinese counterpart). Interactive blocks always come from the English file; the
 * Chinese file only supplies translated text for them (DESIGN.md §6.5).
 */
export const LessonContent = memo(function LessonContent({ en, zh, mode, lessonId }: Props) {
  const { t } = useI18n();
  const enSections = useMemo(() => splitLesson(en), [en]);
  const zhSections = useMemo(() => (zh ? splitLesson(zh) : null), [zh]);
  const parallel = !!zhSections && compareShapes(enSections, zhSections).length === 0;
  const effective: LessonLang = mode !== 'en' && !parallel ? 'en' : mode;

  return (
    <div className="prose-lesson">
      {mode !== 'en' && !parallel && (
        <p className="rounded-btn border border-border bg-surface px-3 py-2 text-sm text-muted" role="note">{t('lesson.zhMissing')}</p>
      )}
      {enSections.map((sec, i) => {
        const zsec = parallel ? zhSections![i] : null;
        return (
          <section key={i} className="grid gap-[1.1rem]" aria-label={sec.heading ?? undefined}>
            {sec.heading && (
              <h2>
                {effective === 'zh' && zsec?.heading ? (
                  <span lang="zh-CN"><InlineMarkdown text={zsec.heading} /></span>
                ) : (
                  <InlineMarkdown text={sec.heading} />
                )}
                {effective === 'both' && zsec?.heading && zsec.heading !== sec.heading && (
                  <span lang="zh-CN" className="font-normal text-muted"> · <InlineMarkdown text={zsec.heading} /></span>
                )}
              </h2>
            )}
            {sec.segments.map((seg, j) => {
              const zseg: Segment | undefined = zsec?.segments[j];
              if (seg.type === 'block') {
                const zhSource = zseg?.type === 'block' ? zseg.source : undefined;
                return <InteractiveBlock key={j} kind={seg.kind} source={seg.source} zhSource={zhSource} mode={effective} lessonId={lessonId} />;
              }
              const zhText = zseg?.type === 'md' ? zseg.text : undefined;
              if (effective === 'zh' && zhText) return <div key={j} lang="zh-CN" className="contents"><Md text={zhText} /></div>;
              if (effective === 'both' && zhText)
                return (
                  <div key={j} className="contents">
                    <PairedMd en={seg.text} zh={zhText} />
                  </div>
                );
              return <div key={j} className="contents"><Md text={seg.text} /></div>;
            })}
          </section>
        );
      })}
    </div>
  );
});
