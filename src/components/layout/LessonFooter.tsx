import type { Lesson } from '../../content/types';
import { useI18n } from '../../i18n/useI18n';

interface Props {
  prev: Lesson | null;
  next: Lesson | null;
  completed: boolean;
  onPrev(): void;
  onNext(): void;
  onToggleComplete(): void;
}

/** Sticky footer: ← Previous · Mark complete · Next → (DESIGN.md §5.4). */
export function LessonFooter({ prev, next, completed, onPrev, onNext, onToggleComplete }: Props) {
  const { t, loc } = useI18n();
  const prevTitle = prev ? loc(prev.title, prev.titleZh) : null;
  const nextTitle = next ? loc(next.title, next.titleZh) : null;
  return (
    <nav aria-label={t('lesson.nav')} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto grid h-16 max-w-[1160px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
        <button className="btn justify-self-start" onClick={onPrev} disabled={!prev} aria-label={prevTitle ? t('lesson.prevAria', { title: prevTitle }) : t('lesson.noPrev')}>
          ← <span className="hidden max-w-[220px] truncate md:inline">{prevTitle ?? t('lesson.previous')}</span>
        </button>
        <button className={`btn ${completed ? 'btn-success' : 'btn-primary'}`} onClick={onToggleComplete} aria-pressed={completed}>
          {t(completed ? 'lesson.completedBtn' : 'lesson.markComplete')}
        </button>
        <button className="btn justify-self-end" onClick={onNext} disabled={!next} aria-label={nextTitle ? t('lesson.nextAria', { title: nextTitle }) : t('lesson.noNext')}>
          <span className="hidden max-w-[220px] truncate md:inline">{nextTitle ?? t('lesson.next')}</span> →
        </button>
      </div>
    </nav>
  );
}
