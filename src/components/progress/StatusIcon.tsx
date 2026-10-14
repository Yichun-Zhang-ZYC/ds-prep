import type { DisplayStatus } from '../../progress/derive';
import { useI18n } from '../../i18n/useI18n';

const LABEL_KEY: Record<DisplayStatus | 'soon', string> = {
  none: 'state.notStarted',
  visited: 'state.inProgress',
  completed: 'state.completed',
  soon: 'state.comingSoon',
};

function Glyph({ status }: { status: DisplayStatus | 'soon' }) {
  const base = 'inline-grid size-[18px] flex-none place-items-center rounded-full border-2';
  if (status === 'completed')
    return (
      <span className={`${base} border-success bg-success`} aria-hidden="true">
        <svg viewBox="0 0 12 12" className="size-2.5">
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  if (status === 'visited')
    return <span className={`${base} border-accent`} style={{ background: 'linear-gradient(90deg, var(--accent) 50%, transparent 50%)' }} aria-hidden="true" />;
  if (status === 'soon') return <span className={`${base} border-dashed border-track`} aria-hidden="true" />;
  return <span className={`${base} border-muted opacity-70`} aria-hidden="true" />;
}

/**
 * ○ not started · ◐ visited · ✓ completed — shape carries the meaning, not just color.
 * With `onMarkUnread`, a ◐ / ✓ icon becomes a button that resets the lesson to ○.
 */
export function StatusIcon({ status, onMarkUnread }: { status: DisplayStatus | 'soon'; onMarkUnread?: () => void }) {
  const { t } = useI18n();
  const label = t(LABEL_KEY[status]);
  if (onMarkUnread && (status === 'visited' || status === 'completed')) {
    const action = `${label} · ${t('progress.markUnread')}`;
    return (
      <button
        type="button"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onMarkUnread();
        }}
        className="group/status relative grid size-6 flex-none place-items-center rounded-full hover:bg-surface-2"
        aria-label={action}
        title={action}
      >
        <span className="group-hover/status:hidden"><Glyph status={status} /></span>
        <span className="hidden group-hover/status:inline-grid"><Glyph status="none" /></span>
      </button>
    );
  }
  return (
    <span role="img" aria-label={label} title={label} className="grid size-6 flex-none place-items-center">
      <Glyph status={status} />
    </span>
  );
}
