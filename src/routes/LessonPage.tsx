import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { splitFrontmatter } from '../content/parse';
import { LESSON_BY_ID, ORDER, SECTION_BY_ID, loadLessonSource } from '../content/loadCurriculum';
import { FullPageSpinner } from '../auth/RequireAuth';
import { Header } from '../components/layout/Header';
import { LessonFooter } from '../components/layout/LessonFooter';
import { Sidebar } from '../components/layout/Sidebar';
import { BlockBadges } from '../components/lesson/BlockBadges';
import { MarkdownRenderer } from '../components/lesson/MarkdownRenderer';
import { useToast } from '../components/Toast';
import { isCompleted, neighbors, stats } from '../progress/derive';
import { useProgress } from '../progress/useProgress';

const DIFFICULTY: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function LessonPage() {
  const { sectionId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { progress, ready, visit, setCompleted } = useProgress();
  const [body, setBody] = useState<string | null>(null);
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
      .then(raw => {
        if (!alive) return;
        if (raw == null) setLoadError(true);
        else setBody(splitFrontmatter(raw).body);
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
    if (next.sectionId !== section.id && stats(section.lessons, progress).state === 'completed') toast(`${section.title} complete 🎉`);
    navigate(`/lesson/${next.sectionId}/${next.id}`);
  }, [next, section, progress, navigate, toast]);

  // ← / → navigate unless focus is in an editor or form field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('.cm-editor'))) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  if (!valid) return <Navigate to={section ? `/section/${section.id}` : '/'} replace />;

  const subtopic = section.subtopics.find(s => s.id === lesson.subtopicId);

  return (
    <>
      <Header onOpenOutline={() => setOutlineOpen(true)} />
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar section={section} currentLessonId={lesson.id} progress={progress} open={outlineOpen} onClose={() => setOutlineOpen(false)} />
        <main className="min-w-0 px-4 pb-36 pt-7 md:px-6">
          <article className="mx-auto grid max-w-[760px] gap-5">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <Link to="/" className="hover:text-accent hover:underline">My Learning</Link>
              <span aria-hidden="true">›</span>
              <Link to={`/section/${section.id}`} className="hover:text-accent hover:underline">{section.title}</Link>
              <span aria-hidden="true">›</span>
              <span>{subtopic?.title}</span>
            </nav>
            <header className="grid gap-2">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[32px]">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="tabular-nums">{lesson.estimatedMinutes} min</span>
                {lesson.difficulty && <><span aria-hidden="true">·</span><span>{DIFFICULTY[lesson.difficulty]}</span></>}
                <BlockBadges blocks={lesson.blocks} />
                {completed && <span className="badge bg-success-soft text-success">Completed</span>}
              </div>
            </header>
            {loadError ? (
              <p className="rounded-card border border-error bg-error-soft p-4 text-sm">This lesson file couldn’t be loaded. Refresh the page to try again.</p>
            ) : body == null || !ready ? (
              <FullPageSpinner label="Loading lesson…" />
            ) : (
              <MarkdownRenderer key={lesson.id} source={body} lessonId={lesson.id} />
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
          toast(completed ? 'Marked as not complete' : 'Lesson complete. Progress updated.');
        }}
      />
    </>
  );
}
