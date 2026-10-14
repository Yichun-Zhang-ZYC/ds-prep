import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Section } from '../../content/types';
import { useI18n } from '../../i18n/useI18n';
import { lessonStatus, stats } from '../../progress/derive';
import type { ProgressMap } from '../../progress/types';
import { useToast } from '../Toast';
import { useProgress } from '../../progress/useProgress';
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
  const { t, loc } = useI18n();
  const { markUnread } = useProgress();
  const toast = useToast();
  const unread = (id: string) => {
    markUnread(id);
    toast(t('progress.markedUnread'));
  };
  const s = stats(section.lessons, progress);
  const title = loc(section.title, section.titleZh);
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
        aria-label={t('section.outline')}
        className={`fixed inset-y-0 left-0 z-50 w-[min(300px,85vw)] overflow-y-auto border-r border-border bg-surface px-4 pb-32 pt-[calc(20px+env(safe-area-inset-top,0px))] transition-transform lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100dvh-56px)] lg:w-auto lg:translate-x-0 lg:pt-5 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-3 grid gap-2 border-b border-border px-1.5 pb-4">
          <span className="eyebrow">{t('section.label')}</span>
          <Link to={`/section/${section.id}`} className="text-[15px] font-semibold hover:text-accent" onClick={onClose}>
            {title}
          </Link>
          <ProgressBar pct={s.pct} label={t('dash.progressOf', { title })} />
          <span className="text-[13px] tabular-nums text-muted">{t('section.sidebarStats', { done: s.completed, total: s.total, pct: s.pct })}</span>
        </div>
        {section.subtopics.map(sub => {
          const ss = stats(sub.lessons, progress);
          return (
            <div key={sub.id}>
              <div className="flex justify-between gap-2 px-1.5 pb-1.5 pt-3.5 text-xs font-semibold uppercase tracking-[0.05em] text-muted">
                <span>{loc(sub.title, sub.titleZh)}</span>
                {ss.total > 0 && <span className="tabular-nums">{ss.completed}/{ss.total}</span>}
              </div>
              {sub.lessons.map(l => {
                if (!l.available)
                  return (
                    <div key={l.id} className="flex items-center gap-1.5 px-1 py-1 text-sm text-muted opacity-70" title={t('common.comingSoon')}>
                      <StatusIcon status="soon" />
                      <span className="min-w-0">{loc(l.title, l.titleZh)}</span>
                    </div>
                  );
                const current = l.id === currentLessonId;
                return (
                  <div key={l.id} className={`flex items-center gap-1.5 rounded-btn pl-1 ${current ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                    <StatusIcon status={lessonStatus(progress, l.id)} onMarkUnread={() => unread(l.id)} />
                    <Link
                      ref={current ? currentRef : undefined}
                      to={`/lesson/${section.id}/${l.id}`}
                      aria-current={current ? 'page' : undefined}
                      onClick={onClose}
                      className={`min-w-0 flex-1 py-1.5 pr-2 text-sm ${current ? 'font-medium text-accent' : ''}`}
                    >
                      {loc(l.title, l.titleZh)}
                    </Link>
                  </div>
                );
              })}
            </div>
          );
        })}
      </aside>
    </>
  );
}
