import { memo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { BLOCK_CHECKS } from '../../content/parse';
import type { BlockKind } from '../../content/types';
import { BLOCK_KINDS } from '../../content/types';
import { BlockError } from '../blocks/BlockFrame';
import { PythonExercise } from '../blocks/PythonExercise';
import { QuizBlock } from '../blocks/QuizBlock';
import { RevealBlock } from '../blocks/RevealBlock';
import { SqlExercise } from '../blocks/SqlExercise';
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

function InteractiveBlock({ kind, source, lessonId }: { kind: BlockKind; source: string; lessonId: string }) {
  const { data, errors } = BLOCK_CHECKS[kind](source);
  if (!data) return <BlockError kind={kind} errors={errors} />;
  switch (kind) {
    case 'quiz':
      return <QuizBlock data={data as Parameters<typeof QuizBlock>[0]['data']} lessonId={lessonId} />;
    case 'sql-exercise':
      return <SqlExercise data={data as Parameters<typeof SqlExercise>[0]['data']} lessonId={lessonId} />;
    case 'python-exercise':
      return <PythonExercise data={data as Parameters<typeof PythonExercise>[0]['data']} lessonId={lessonId} />;
    case 'reveal':
      return <RevealBlock data={data as Parameters<typeof RevealBlock>[0]['data']} />;
  }
}

/**
 * Renders a lesson body. Fenced blocks whose language is an interactive kind
 * (quiz, sql-exercise, python-exercise, reveal) become components (DESIGN.md §6.3).
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ source, lessonId }: { source: string; lessonId: string }) {
  const components: Components = {
    pre: ({ node }) => {
      const codeEl = (node as HastNode | undefined)?.children?.find(c => c.tagName === 'code');
      const classes = codeEl?.properties?.className;
      const langClass = Array.isArray(classes) ? classes.find(c => String(c).startsWith('language-')) : undefined;
      const lang = langClass ? String(langClass).slice('language-'.length) : undefined;
      const code = textOf(codeEl);
      if (lang && (BLOCK_KINDS as string[]).includes(lang)) return <InteractiveBlock kind={lang as BlockKind} source={code} lessonId={lessonId} />;
      return <CodeBlock code={code} language={lang} />;
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

  return (
    <div className="prose-lesson">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkCallouts]} rehypePlugins={[rehypeKatex]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
});
