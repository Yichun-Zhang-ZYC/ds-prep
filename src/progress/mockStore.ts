import type { ProgressMap, ProgressPatch, ProgressStore, UserDoc } from './types';
import { applyPatch } from './types';

/**
 * Browser-only store for demo mode and tests. Persists to localStorage when
 * available, otherwise keeps everything in memory.
 */
export function createMockStore(uid: string, initialUser?: Partial<UserDoc>, opts: { persist?: boolean } = {}): ProgressStore {
  const persist = opts.persist ?? true;
  const key = `dsprep-demo-${uid}`;
  type Saved = { user: UserDoc | null; progress: [string, ReturnType<typeof applyPatch>][] };

  const load = (): Saved => {
    if (!persist) return { user: null, progress: [] };
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as Saved;
    } catch { /* storage blocked or corrupt → start fresh */ }
    return { user: null, progress: [] };
  };

  const saved = load();
  let user: UserDoc | null = saved.user;
  let progress: ProgressMap = new Map(saved.progress);
  if (!user && initialUser) {
    const now = Date.now();
    user = { displayName: '', email: '', photoURL: '', targetRole: null, lastLessonId: null, createdAt: now, updatedAt: now, ...initialUser };
  }
  const listeners = new Set<(m: ProgressMap) => void>();

  const save = () => {
    if (!persist) return;
    try { localStorage.setItem(key, JSON.stringify({ user, progress: [...progress] })); } catch { /* ignore */ }
  };
  const emit = () => {
    const snapshot = new Map(progress);
    listeners.forEach(l => l(snapshot));
  };

  return {
    subscribeProgress(onData) {
      listeners.add(onData);
      onData(new Map(progress));
      return () => listeners.delete(onData);
    },
    async getUser() {
      return user;
    },
    async updateUser(patch) {
      const now = Date.now();
      user = { ...(user ?? { displayName: '', email: '', photoURL: '', targetRole: null, lastLessonId: null, createdAt: now }), ...patch, updatedAt: now } as UserDoc;
      save();
    },
    async writeProgress(lessonId: string, patch: ProgressPatch) {
      progress.set(lessonId, applyPatch(progress.get(lessonId), patch, Date.now()));
      save();
      emit();
    },
    async resetProgress() {
      progress = new Map();
      save();
      emit();
    },
  };
}
