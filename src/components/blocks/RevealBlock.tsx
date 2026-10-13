import type { RevealBlockData, RevealZh } from '../../content/types';
import type { LessonLang } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/useI18n';
import { Bi } from './Bilingual';

/** Collapsible "Show answer" for open-ended interview questions. */
export function RevealBlock({ data, zh, mode = 'en' }: { data: RevealBlockData; zh?: RevealZh; mode?: LessonLang }) {
  const { t } = useI18n();
  return (
    <details className="group rounded-card border border-border leading-normal">
      <summary className="flex items-start gap-2.5 px-4.5 py-3.5 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 text-accent transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow mb-1 block">{t('reveal.label')}</span>
          <Bi mode={mode} en={data.prompt} zh={zh?.prompt} />
        </span>
        <span className="shrink-0 text-[13px] font-medium text-accent group-open:hidden">{t('reveal.show')}</span>
        <span className="hidden shrink-0 text-[13px] font-medium text-muted group-open:inline">{t('reveal.hide')}</span>
      </summary>
      <div className="border-t border-border px-4.5 py-4">
        <Bi mode={mode} en={data.answer} zh={zh?.answer} block />
      </div>
    </details>
  );
}
