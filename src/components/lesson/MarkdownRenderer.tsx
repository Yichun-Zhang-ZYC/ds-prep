import { memo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CodeBlock } from './CodeBlock';
import { remarkCallouts } from './remarkCallouts';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

const textOf = (n?: HastNode): string => (n?.type === 'text' ? n.value ?? '' : (n?.children ?? []).map(textOf).join(''));

const components: Components = {
  pre: ({ node }) => {
    const codeEl = (node as HastNode | undefined)?.children?.find(c => c.tagName === 'code');
    const classes = codeEl?.properties?.className;
    const langClass = Array.isArray(classes) ? classes.find(c => String(c).startsWith('language-')) : undefined;
    const lang = langClass ? String(langClass).slice('language-'.length) : undefined;
    return <CodeBlock code={textOf(codeEl)} language={lang} />;
  },
  table: ({ children }: { children?: ReactNode }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      {children}
    </a>
  ),
};

/**
 * Renders one run of lesson Markdown (text, tables, math, code, callouts) as siblings
 * inside the surrounding `.prose-lesson` grid. Interactive blocks are split out
 * beforehand by splitLesson() and rendered by LessonContent.
 */
export const Md = memo(function Md({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkCallouts]} rehypePlugins={[rehypeKatex]} components={components}>
      {text}
    </ReactMarkdown>
  );
});
