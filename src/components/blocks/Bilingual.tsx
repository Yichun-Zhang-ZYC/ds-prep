import type { LessonLang } from '../../i18n/I18nProvider';
import { isCodeChunk, splitParagraphs } from '../../content/segments';
import { BlockMarkdown, InlineMarkdown } from '../lesson/InlineMarkdown';

/** Picks the text for the lesson language. Chinese falls back to English when untranslated. */
export function pickText(mode: LessonLang, en: string, zh?: string): string {
  return mode === 'zh' && zh ? zh : en;
}

/**
 * Renders a translatable string from a block. In Combined mode the Chinese text
 * follows the English one, visually secondary, unless they're identical (e.g. code).
 */
export function Bi({ mode, en, zh, block = false }: { mode: LessonLang; en: string; zh?: string; block?: boolean }) {
  const Md = block ? BlockMarkdown : InlineMarkdown;
  if (mode !== 'both' || !zh || zh.trim() === en.trim()) return <Md text={pickText(mode, en, zh)} />;
  if (block) {
    // Same paragraph count: interleave, and show identical chunks or code only once.
    const enParas = splitParagraphs(en);
    const zhParas = splitParagraphs(zh);
    if (enParas.length === zhParas.length)
      return (
        <div className="grid gap-2">
          {enParas.map((p, k) => {
            const z = zhParas[k];
            const same = p.trim() === z.trim() || (isCodeChunk(p) && isCodeChunk(z));
            return (
              <div key={k} className="grid gap-2">
                <Md text={p} />
                {!same && (
                  <div lang="zh-CN" className="border-l-2 border-accent/40 pl-3 text-[0.95em] text-muted">
                    <Md text={z} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    return (
      <div className="grid gap-2">
        <Md text={en} />
        <div lang="zh-CN" className="border-l-2 border-accent/40 pl-3 text-[0.95em] text-muted">
          <Md text={zh} />
        </div>
      </div>
    );
  }
  return (
    <span className="grid gap-0.5">
      <span><Md text={en} /></span>
      <span lang="zh-CN" className="text-[0.92em] font-normal text-muted"><Md text={zh} /></span>
    </span>
  );
}
