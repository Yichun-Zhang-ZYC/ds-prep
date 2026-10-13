import type { Lesson } from '../../content/types';

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
  return (
    <nav aria-label="Lesson navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto grid h-16 max-w-[1160px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
        <button className="btn justify-self-start" onClick={onPrev} disabled={!prev} aria-label={prev ? `Previous lesson: ${prev.title}` : 'No previous lesson'}>
          ← <span className="hidden max-w-[220px] truncate md:inline">{prev?.title ?? 'Previous'}</span>
        </button>
        <button className={`btn ${completed ? 'btn-success' : 'btn-primary'}`} onClick={onToggleComplete} aria-pressed={completed}>
          {completed ? '✓ Completed' : 'Mark complete'}
        </button>
        <button className="btn justify-self-end" onClick={onNext} disabled={!next} aria-label={next ? `Next lesson: ${next.title}` : 'No next lesson'}>
          <span className="hidden max-w-[220px] truncate md:inline">{next?.title ?? 'Next'}</span> →
        </button>
      </div>
    </nav>
  );
}
