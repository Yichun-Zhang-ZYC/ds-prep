import type { DisplayStatus } from '../../progress/derive';

const LABEL: Record<DisplayStatus | 'soon', string> = {
  none: 'Not started',
  visited: 'In progress',
  completed: 'Completed',
  soon: 'Coming soon',
};

/** ○ not started · ◐ visited · ✓ completed — shape carries the meaning, not just color. */
export function StatusIcon({ status }: { status: DisplayStatus | 'soon' }) {
  const base = 'inline-grid size-[18px] flex-none place-items-center rounded-full border-2';
  if (status === 'completed')
    return (
      <span role="img" aria-label={LABEL.completed} title={LABEL.completed} className={`${base} border-success bg-success`}>
        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  if (status === 'visited')
    return (
      <span
        role="img"
        aria-label={LABEL.visited}
        title={LABEL.visited}
        className={`${base} border-accent`}
        style={{ background: 'linear-gradient(90deg, var(--accent) 50%, transparent 50%)' }}
      />
    );
  if (status === 'soon')
    return <span role="img" aria-label={LABEL.soon} title={LABEL.soon} className={`${base} border-dashed border-track`} />;
  return <span role="img" aria-label={LABEL.none} title={LABEL.none} className={`${base} border-muted opacity-70`} />;
}
