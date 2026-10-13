import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';

export function BlockFrame({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3.5 rounded-card border border-border bg-bg p-4.5 leading-normal" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function BlockError({ kind, errors }: { kind: string; errors: string[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-card border border-error bg-error-soft p-4 text-sm" role="alert">
      <b>{t('ex.broken', { kind })}</b> {t('ex.brokenHint')}
      <ul className="mt-1 list-disc pl-5">{errors.map(e => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}

export function Feedback({ tone, children }: { tone: 'ok' | 'bad' | 'info'; children: ReactNode }) {
  const cls =
    tone === 'ok' ? 'border-success bg-success-soft' : tone === 'bad' ? 'border-error bg-error-soft' : 'border-border bg-surface';
  return (
    <div className={`rounded-btn border-l-[3px] px-3 py-2.5 text-sm leading-relaxed ${cls}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
