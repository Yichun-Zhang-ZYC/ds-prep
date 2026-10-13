import { useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { sql, SQLite } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { useTheme } from '../../theme';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

interface Props {
  id: string;
  language: 'sql' | 'python';
  value: string;
  onChange(value: string): void;
  /** Cmd/Ctrl+Enter inside the editor (DESIGN.md §5.4). */
  onRun(): void;
  label: string;
}

export function CodeEditor({ id, language, value, onChange, onRun, label }: Props) {
  const { theme } = useTheme();
  const runRef = useRef(onRun);
  runRef.current = onRun;

  const extensions = useMemo(
    () => [
      language === 'sql' ? sql({ dialect: SQLite, upperCaseKeywords: true }) : python(),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { runRef.current(); return true; } }])),
    ],
    [language],
  );

  return (
    <div className="grid gap-1.5">
      <CodeMirror
        id={id}
        aria-label={label}
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={theme}
        minHeight="140px"
        maxHeight="420px"
        basicSetup={{ foldGutter: false, highlightActiveLineGutter: false, autocompletion: true }}
      />
      <div className="text-xs text-muted">
        <kbd className="rounded border border-b-2 border-border px-1 font-mono text-[11px]">{IS_MAC ? '⌘' : 'Ctrl'}</kbd>{' '}
        <kbd className="rounded border border-b-2 border-border px-1 font-mono text-[11px]">Enter</kbd> to run
      </div>
    </div>
  );
}
