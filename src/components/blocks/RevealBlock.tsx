import type { RevealBlockData } from '../../content/types';
import { BlockMarkdown, InlineMarkdown } from '../lesson/InlineMarkdown';

/** Collapsible "Show answer" for open-ended interview questions. */
export function RevealBlock({ data }: { data: RevealBlockData }) {
  return (
    <details className="group rounded-card border border-border leading-normal">
      <summary className="flex items-start gap-2.5 px-4.5 py-3.5 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 text-accent transition-transform group-open:rotate-90" aria-hidden="true">›</span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow mb-1 block">Interview question</span>
          <InlineMarkdown text={data.prompt} />
        </span>
        <span className="shrink-0 text-[13px] font-medium text-accent group-open:hidden">Show answer</span>
        <span className="hidden shrink-0 text-[13px] font-medium text-muted group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-border px-4.5 py-4">
        <BlockMarkdown text={data.answer} />
      </div>
    </details>
  );
}
