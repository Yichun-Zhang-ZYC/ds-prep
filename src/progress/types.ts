import type { RoleKey } from '../content/types';

/** 'unvisited' = the learner marked the lesson unread; quiz / exercise history is kept. */
export type LessonStatus = 'visited' | 'completed' | 'unvisited';

export interface QuizRecord {
  correct: boolean;
  attempts: number;
}

export interface ExerciseRecord {
  passed: boolean;
  lastCode: string;
}

/** users/{uid}/progress/{lessonId} — timestamps are epoch milliseconds in the app. */
export interface LessonProgress {
  status: LessonStatus;
  completedAt: number | null;
  firstVisitedAt: number;
  quiz: Record<string, QuizRecord>;
  exercises: Record<string, ExerciseRecord>;
  updatedAt: number;
}

/** users/{uid} */
export interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string;
  targetRole: RoleKey | null;
  /** Plain lesson id (ids are globally unique). */
  lastLessonId: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Shallow fields are replaced; quiz / exercises entries are merged by key. */
export interface ProgressPatch {
  status?: LessonStatus;
  completedAt?: number | null;
  firstVisitedAt?: number;
  quiz?: Record<string, QuizRecord>;
  exercises?: Record<string, Partial<ExerciseRecord>>;
}

export type ProgressMap = Map<string, LessonProgress>;

/**
 * The only way UI code touches persisted progress (DESIGN.md §3, §14).
 * Implementations: localStore (demo / mock), firestoreStore.
 */
export interface ProgressStore {
  subscribeProgress(onData: (map: ProgressMap) => void, onError: (e: Error) => void): () => void;
  getUser(): Promise<UserDoc | null>;
  updateUser(patch: Partial<UserDoc>): Promise<void>;
  writeProgress(lessonId: string, patch: ProgressPatch): Promise<void>;
  resetProgress(): Promise<void>;
}

/** Applies a patch to a progress entry the same way the stores do. */
export function applyPatch(prev: LessonProgress | undefined, patch: ProgressPatch, now: number): LessonProgress {
  const base: LessonProgress = prev ?? {
    status: 'visited',
    completedAt: null,
    firstVisitedAt: now,
    quiz: {},
    exercises: {},
    updatedAt: now,
  };
  const exercises = { ...base.exercises };
  for (const [k, v] of Object.entries(patch.exercises ?? {})) {
    const prevEx = exercises[k] as ExerciseRecord | undefined;
    exercises[k] = { passed: prevEx?.passed ?? false, lastCode: prevEx?.lastCode ?? '', ...v };
  }
  return {
    ...base,
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.completedAt !== undefined && { completedAt: patch.completedAt }),
    ...(patch.firstVisitedAt !== undefined && { firstVisitedAt: patch.firstVisitedAt }),
    quiz: { ...base.quiz, ...patch.quiz },
    exercises,
    updatedAt: now,
  };
}
