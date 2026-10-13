import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { splitFrontmatter } from '../content/parse';
import { LESSON_BY_ID, ORDER, SECTION_BY_ID, loadLessonSource } from '../content/loadCurriculum';
import { FullPageSpinner } from '../auth/RequireAuth';
import { Header, Segmented } from '../components/layout/Header';
import { LessonFooter } from '../components/layout/LessonFooter';
import { Sidebar } from '../components/layout/Sidebar';
import { BlockBadges } from '../components/lesson/BlockBadges';
import { LessonContent } from '../components/lesson/LessonContent';
import { useToast } from '../components/Toast';
import type { LessonLang } from '../i18n/I18nProvider';
import { useI18n } from '../i18n/useI18n';
import { isCompleted, neighbors, stats } from '../progress/derive';
import { useProgress } from '../progress/useProgress';

export function LessonPage() {
  const { sectionId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, loc, lesson: mode, setLesson } = useI18n();
  const { progress, ready, visit, setCompleted } = useProgress();
  const [body, setBody] = useState<{ en: string; zh: string | null } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  const lesson = LESSON_BY_ID.get(lessonId);
  const section = SECTION_BY_ID.get(sectionId);
  const valid = !!lesson && !!section && lesson.sectionId === section.id && lesson.available;

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    setBody(null);
    setLoadError(false);
    loadLessonSource(sectionId, lessonId)
      .then(src => {
        if (!alive) return;
        if (!src) setLoadError(true);
        else setBody({ en: splitFrontmatter(src.en).body, zh: src.zh ? splitFrontmatter(src.zh).body : null });
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [sectionId, lessonId, valid]);

  // Visiting sets lastLessonId and marks the lesson visited (DESIGN.md §5.4).
  useEffect(() => {
    if (valid && ready) visit(lessonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, valid, ready]);

  const { prev, next } = neighbors(ORDER, lessonId);
  const completed = isCompleted(progress, lessonId);

  const goPrev = useCallback(() => {
    if (prev) navigate(`/lesson/${prev.sectionId}/${prev.id}`);
  }, [prev, navigate]);

  const goNext = useCallback(() => {
    if (!next || !section) return;
    if (next.sectionId !== section.id && stats(section.lessons, progress).state === 'completed')
      toast(t('lesson.sectionDone', { title: loc(section.title, section.titleZh) }));
    navigate(`/lesson/${next.sectionId}/${next.id}`);
  }, [next, section, progress, navigate, toast, t, loc]);

  // ← / → navigate unless focus is in an editor or form field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('.cm-editor') || el.closest('[role="radiogroup"]'))) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  if (!valid) return <Navigate to={section ? `/section/${section.id}` : '/'} replace />;

  const subtopic = section.subtopics.find(s => s.id === lesson.subtopicId);
  const zhTitle = lesson.titleZh;

  return (
    <>
      <Header onOpenOutline={() => setOutlineOpen(true)} />
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar section={section} currentLessonId={lesson.id} progress={progress} open={outlineOpen} onClose={() => setOutlineOpen(false)} />
        <main className="min-w-0 px-4 pb-36 pt-7 md:px-6">
          <article className="mx-auto grid max-w-[760px] gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label={t('common.breadcrumb')} className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted">
                <Link to="/" className="hover:text-accent hover:underline">{t('common.myLearning')}</Link>
                <span aria-hidden="true">›</span>
                <Link to={`/section/${section.id}`} className="hover:text-accent hover:underline">{loc(section.title, section.titleZh)}</Link>
                {subtopic && (
                  <>
                    <span aria-hidden="true">›</span>
                    <span>{loc(subtopic.title, subtopic.titleZh)}</span>
                  </>
                )}
              </nav>
              <Segmented<LessonLang>
                label={t('lesson.contentLang')}
                value={mode}
                onChange={setLesson}
                size="md"
                options={[
                  { value: 'en', label: t('lesson.mode.en') },
                  { value: 'zh', label: t('lesson.mode.zh') },
                  { value: 'both', label: t('lesson.mode.both') },
                ]}
              />
            </div>
            <header className="grid gap-2">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[32px]">
                {mode === 'zh' && zhTitle ? <span lang="zh-CN">{zhTitle}</span> : lesson.title}
              </h1>
              {mode === 'both' && zhTitle && zhTitle !== lesson.title && (
                <p lang="zh-CN" className="-mt-1 text-lg font-medium text-muted">{zhTitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="tabular-nums">{t('common.minutes', { n: lesson.estimatedMinutes })}</span>
                {lesson.difficulty && <><span aria-hidden="true">·</span><span>{t(`lesson.${lesson.difficulty}`)}</span></>}
                <BlockBadges blocks={lesson.blocks} />
                {completed && <span className="badge bg-success-soft text-success">{t('state.completed')}</span>}
              </div>
            </header>
            {loadError ? (
              <p className="rounded-card border border-error bg-error-soft p-4 text-sm">{t('lesson.loadError')}</p>
            ) : body == null || !ready ? (
              <FullPageSpinner label={t('lesson.loading')} />
            ) : (
              <LessonContent key={lesson.id} en={body.en} zh={body.zh} mode={mode} lessonId={lesson.id} />
            )}
          </article>
        </main>
      </div>
      <LessonFooter
        prev={prev}
        next={next}
        completed={completed}
        onPrev={goPrev}
        onNext={goNext}
        onToggleComplete={() => {
          setCompleted(lesson.id, !completed);
          toast(t(completed ? 'lesson.toastIncomplete' : 'lesson.toastComplete'));
        }}
      />
    </>
  );
}
