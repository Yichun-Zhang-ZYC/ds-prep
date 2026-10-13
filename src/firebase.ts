import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Local cache keeps the UI usable through brief network drops (DESIGN.md §10).
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
}

export { auth, db };
