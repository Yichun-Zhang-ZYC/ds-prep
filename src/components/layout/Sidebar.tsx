import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Section } from '../../content/types';
import { lessonStatus, stats } from '../../progress/derive';
import type { ProgressMap } from '../../progress/types';
import { ProgressBar } from '../progress/ProgressBar';
import { StatusIcon } from '../progress/StatusIcon';

interface Props {
  section: Section;
  currentLessonId: string;
  progress: ProgressMap;
  open: boolean;
  onClose(): void;
}

/** Section outline. Sticky column on desktop, slide-in drawer below lg. */
export function Sidebar({ section, currentLessonId, progress, open, onClose }: Props) {
  const s = stats(section.lessons, progress);
  const currentRef = useRef<HTMLAnchorElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  // Center the current lesson inside the outline without scrolling the page itself.
  useEffect(() => {
    const aside = asideRef.current;
    const el = currentRef.current;
    if (!aside || !el) return;
    const top = el.offsetTop - aside.clientHeight / 2 + el.clientHeight / 2;
    if (el.offsetTop < aside.scrollTop || el.offsetTop > aside.scrollTop + aside.clientHeight - 40) aside.scrollTop = Math.max(0, top);
  }, [currentLessonId]);

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/35 lg:hidden ${open ? '' : 'hidden'}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={asideRef}
        aria-label="Section outline"
        className={`fixed inset-y-0 left-0 z-50 w-[min(300px,85vw)] overflow-y-auto border-r border-border bg-surface px-4 pb-32 pt-[calc(20px+env(safe-area-inset-top,0px))] transition-transform lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100dvh-56px)] lg:w-auto lg:translate-x-0 lg:pt-5 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-3 grid gap-2 border-b border-border px-1.5 pb-4">
          <span className="eyebrow">Section</span>
          <Link to={`/section/${section.id}`} className="text-[15px] font-semibold hover:text-accent" onClick={onClose}>
            {section.title}
          </Link>
          <ProgressBar pct={s.pct} label={`${section.title} progress`} />
          <span className="text-[13px] tabular-nums text-muted">
            {s.completed} / {s.total} lessons · {s.pct}%
          </span>
        </div>
        {section.subtopics.map(sub => {
          const ss = stats(sub.lessons, progress);
          return (
            <div key={sub.id}>
              <div className="flex justify-between gap-2 px-1.5 pb-1.5 pt-3.5 text-xs font-semibold uppercase tracking-[0.05em] text-muted">
                <span>{sub.title}</span>
                {ss.total > 0 && <span className="tabular-nums">{ss.completed}/{ss.total}</span>}
              </div>
              {sub.lessons.map(l => {
                if (!l.available)
                  return (
                    <div key={l.id} className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-muted opacity-70" title="Coming soon">
                      <StatusIcon status="soon" />
                      <span className="min-w-0">{l.title}</span>
                    </div>
                  );
                const current = l.id === currentLessonId;
                return (
                  <Link
                    key={l.id}
                    ref={current ? currentRef : undefined}
                    to={`/lesson/${section.id}/${l.id}`}
                    aria-current={current ? 'page' : undefined}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 rounded-btn px-2 py-1.5 text-sm ${current ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-surface-2'}`}
                  >
                    <StatusIcon status={lessonStatus(progress, l.id)} />
                    <span className="min-w-0">{l.title}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </aside>
    </>
  );
}
