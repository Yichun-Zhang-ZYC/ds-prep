import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import type { LessonProgress, ProgressMap, ProgressPatch, ProgressStore, UserDoc } from './types';

const ms = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0);
const ts = (v: number | null | undefined) => (v == null ? null : Timestamp.fromMillis(v));

function toProgress(d: DocumentData): LessonProgress {
  return {
    status: d.status === 'completed' ? 'completed' : 'visited',
    completedAt: d.completedAt ? ms(d.completedAt) : null,
    firstVisitedAt: ms(d.firstVisitedAt),
    quiz: d.quiz ?? {},
    exercises: d.exercises ?? {},
    updatedAt: ms(d.updatedAt),
  };
}

function toUser(d: DocumentData): UserDoc {
  return {
    displayName: d.displayName ?? '',
    email: d.email ?? '',
    photoURL: d.photoURL ?? '',
    targetRole: d.targetRole ?? null,
    lastLessonId: d.lastLessonId ?? null,
    createdAt: ms(d.createdAt),
    updatedAt: ms(d.updatedAt),
  };
}

export function createFirestoreStore(db: Firestore, uid: string): ProgressStore {
  const userRef = doc(db, 'users', uid);
  const progressCol = collection(db, 'users', uid, 'progress');

  return {
    subscribeProgress(onData, onError) {
      return onSnapshot(
        progressCol,
        snap => {
          const map: ProgressMap = new Map();
          snap.forEach(d => map.set(d.id, toProgress(d.data())));
          onData(map);
        },
        onError,
      );
    },

    async getUser() {
      const snap = await getDoc(userRef);
      return snap.exists() ? toUser(snap.data()) : null;
    },

    async updateUser(patch) {
      const data: DocumentData = { ...patch, updatedAt: Timestamp.now() };
      if (patch.createdAt !== undefined) data.createdAt = ts(patch.createdAt);
      await setDoc(userRef, data, { merge: true });
    },

    async writeProgress(lessonId: string, patch: ProgressPatch) {
      const data: DocumentData = { updatedAt: Timestamp.now() };
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.completedAt !== undefined) data.completedAt = ts(patch.completedAt);
      if (patch.firstVisitedAt !== undefined) data.firstVisitedAt = ts(patch.firstVisitedAt);
      // setDoc + merge merges nested maps key by key, so one quiz/exercise entry never clobbers another.
      if (patch.quiz) data.quiz = patch.quiz;
      if (patch.exercises) data.exercises = patch.exercises;
      await setDoc(doc(progressCol, lessonId), data, { merge: true });
    },

    async resetProgress() {
      const snap = await getDocs(progressCol);
      // Firestore batches cap at 500 writes.
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await setDoc(userRef, { lastLessonId: null, updatedAt: Timestamp.now() }, { merge: true });
    },
  };
}
