import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'dsprep-theme';

const systemDark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

/** Dark mode follows the system until the user toggles; the choice is saved to localStorage. */
export function useTheme() {
  const read = (): Theme => (document.documentElement.dataset.theme as Theme | undefined) ?? (systemDark() ? 'dark' : 'light');
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (!document.documentElement.dataset.theme) setTheme(read()); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
