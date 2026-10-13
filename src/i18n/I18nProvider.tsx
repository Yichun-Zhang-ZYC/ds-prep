import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ROLE_LABELS, type RoleKey } from '../content/types';
import { STRINGS, type StringKey } from './strings';

/** Interface language (all pages). */
export type UiLang = 'en' | 'zh';
/** Lesson content language: English, Chinese, or both side by side (DESIGN.md §5.5). */
export type LessonLang = 'en' | 'zh' | 'both';

const UI_KEY = 'dsprep-ui-lang';
const LESSON_KEY = 'dsprep-lesson-lang';

const ROLE_LABELS_ZH: Record<RoleKey, string> = {
  ds: '数据科学家',
  aids: 'AI 数据科学家',
  da: '数据分析师',
  bi: 'BI 开发',
  de: '数据工程师',
  mle: '机器学习工程师',
  mlsci: '机器学习科学家',
  aidev: 'AI 开发 / AI 工程师',
  mlops: 'MLOps 工程师',
  devops: 'DevOps 工程师',
  dataops: 'DataOps 工程师',
};

export interface I18nValue {
  ui: UiLang;
  setUi(lang: UiLang): void;
  lesson: LessonLang;
  setLesson(lang: LessonLang): void;
  /** Translate a UI string; unknown keys (e.g. raw error messages) are returned as-is. */
  t(key: StringKey | string, vars?: Record<string, string | number>): string;
  /** Pick the English or Chinese variant of a content field (falls back to English). */
  loc(en: string, zh?: string): string;
  roleLabel(role: RoleKey): string;
}

export const I18nContext = createContext<I18nValue | null>(null);

const read = <T extends string>(key: string, allowed: readonly T[]): T | null => {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, v: string) => {
  try { localStorage.setItem(key, v); } catch { /* ignore */ }
};

const browserDefault = (): UiLang =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ui, setUiState] = useState<UiLang>(() => read(UI_KEY, ['en', 'zh'] as const) ?? browserDefault());
  const [lesson, setLessonState] = useState<LessonLang>(() => read(LESSON_KEY, ['en', 'zh', 'both'] as const) ?? ui);

  useEffect(() => {
    document.documentElement.lang = ui === 'zh' ? 'zh-CN' : 'en';
  }, [ui]);

  const setUi = useCallback((lang: UiLang) => {
    setUiState(lang);
    write(UI_KEY, lang);
    // Lessons follow the interface language until the learner picks a lesson mode explicitly.
    if (!read(LESSON_KEY, ['en', 'zh', 'both'] as const)) setLessonState(lang);
  }, []);

  const setLesson = useCallback((lang: LessonLang) => {
    setLessonState(lang);
    write(LESSON_KEY, lang);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      const entry = (STRINGS as Record<string, { en: string; zh: string }>)[key];
      let s = entry ? entry[ui] : key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    return {
      ui,
      setUi,
      lesson,
      setLesson,
      t,
      loc: (en, zh) => (ui === 'zh' && zh ? zh : en),
      roleLabel: role => (ui === 'zh' ? ROLE_LABELS_ZH[role] : ROLE_LABELS[role]),
    };
  }, [ui, lesson, setUi, setLesson]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
