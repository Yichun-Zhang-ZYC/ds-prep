import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RoleKey } from '../content/types';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n/useI18n';
import type { ProgressMap, ProgressPatch, ProgressStore, UserDoc } from './types';
import { applyPatch } from './types';

export interface ProgressContextValue {
  ready: boolean;
  progress: ProgressMap;
  user: UserDoc | null;
  visit(lessonId: string): void;
  setCompleted(lessonId: string, completed: boolean): void;
  recordQuiz(lessonId: string, quizId: string, correct: boolean): void;
  recordExercise(lessonId: string, exerciseId: string, update: { passed?: boolean; code?: string }): void;
  setTargetRole(role: RoleKey | null): void;
  resetProgress(): Promise<void>;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

const CODE_DEBOUNCE_MS = 1000;

/**
 * Holds the signed-in user's progress in memory (one onSnapshot subscription) and
 * writes optimistically through the ProgressStore (DESIGN.md §7, §10).
 */
export function ProgressProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  const toast = useToast();
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const [progress, setProgress] = useState<ProgressMap>(new Map());
  const [user, setUser] = useState<UserDoc | null>(null);
  const [ready, setReady] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const codeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const fail = useCallback(
    (e: unknown) => {
      console.error(e);
      toast(tRef.current('lesson.saveFailed'), 'error');
    },
    [toast],
  );

  useEffect(() => {
    let alive = true;
    store.getUser().then(u => alive && setUser(u)).catch(fail);
    const unsub = store.subscribeProgress(
      map => {
        if (!alive) return;
        setProgress(map);
        setReady(true);
      },
      e => {
        fail(e);
        setReady(true);
      },
    );
    const timers = codeTimers.current;
    return () => {
      alive = false;
      unsub();
      timers.forEach(clearTimeout);
    };
  }, [store, fail]);

  const write = useCallback(
    (lessonId: string, patch: ProgressPatch) => {
      setProgress(prev => {
        const next = new Map(prev);
        next.set(lessonId, applyPatch(prev.get(lessonId), patch, Date.now()));
        return next;
      });
      store.writeProgress(lessonId, patch).catch(fail);
    },
    [store, fail],
  );

  const updateUser = useCallback(
    (patch: Partial<UserDoc>) => {
      setUser(prev => (prev ? { ...prev, ...patch } : prev));
      store.updateUser(patch).catch(fail);
    },
    [store, fail],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      progress,
      user,
      visit(lessonId) {
        if (user?.lastLessonId !== lessonId) updateUser({ lastLessonId: lessonId });
        if (!progressRef.current.has(lessonId)) write(lessonId, { status: 'visited', firstVisitedAt: Date.now() });
      },
      setCompleted(lessonId, completed) {
        write(lessonId, completed ? { status: 'completed', completedAt: Date.now() } : { status: 'visited', completedAt: null });
      },
      recordQuiz(lessonId, quizId, correct) {
        const prev = progressRef.current.get(lessonId)?.quiz[quizId];
        write(lessonId, { quiz: { [quizId]: { correct: (prev?.correct ?? false) || correct, attempts: (prev?.attempts ?? 0) + 1 } } });
      },
      recordExercise(lessonId, exerciseId, { passed, code }) {
        const prevPassed = progressRef.current.get(lessonId)?.exercises[exerciseId]?.passed ?? false;
        if (passed !== undefined) write(lessonId, { exercises: { [exerciseId]: { passed: prevPassed || passed } } });
        if (code !== undefined) {
          const key = `${lessonId}/${exerciseId}`;
          clearTimeout(codeTimers.current.get(key));
          codeTimers.current.set(
            key,
            setTimeout(() => write(lessonId, { exercises: { [exerciseId]: { lastCode: code } } }), CODE_DEBOUNCE_MS),
          );
        }
      },
      setTargetRole(role) {
        updateUser({ targetRole: role });
      },
      async resetProgress() {
        setProgress(new Map());
        setUser(prev => (prev ? { ...prev, lastLessonId: null } : prev));
        await store.resetProgress();
      },
    }),
    [ready, progress, user, write, updateUser, store],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
