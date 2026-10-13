import { Highlight, type PrismTheme } from 'prism-react-renderer';

const theme: PrismTheme = {
  plain: { color: 'var(--text)', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--tok-comment)', fontStyle: 'italic' } },
    { types: ['keyword', 'builtin', 'boolean', 'important'], style: { color: 'var(--tok-keyword)', fontWeight: '500' } },
    { types: ['string', 'char', 'attr-value', 'regex'], style: { color: 'var(--tok-string)' } },
    { types: ['number', 'constant'], style: { color: 'var(--tok-number)' } },
    { types: ['function', 'class-name'], style: { color: 'var(--tok-function)' } },
    { types: ['operator', 'punctuation'], style: { color: 'var(--tok-operator)' } },
  ],
};

const ALIASES: Record<string, string> = { py: 'python', sh: 'bash', shell: 'bash' };

/** Read-only, highlighted code block. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const lang = ALIASES[language ?? ''] ?? language ?? 'text';
  return (
    <Highlight code={code.replace(/\n$/, '')} language={lang} theme={theme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="code-block" data-language={lang}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
