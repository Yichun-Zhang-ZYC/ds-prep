import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { ReactNode } from 'react';

/** Markdown for short strings inside blocks (quiz options, prompts). Paragraphs unwrap to inline. */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <span className="min-w-0 [&_code]:rounded-[5px] [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.88em]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }: { children?: ReactNode }) => <>{children}</> }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}

/** Markdown for multi-paragraph strings inside blocks (reveal answers, exercise prompts). */
export function BlockMarkdown({ text }: { text: string }) {
  return (
    <div className="prose-lesson gap-2.5 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
