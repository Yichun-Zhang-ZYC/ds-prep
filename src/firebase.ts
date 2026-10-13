import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

// `npm run dev:demo` forces demo mode locally (fake sign-in) even though a config is present.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && import.meta.env.VITE_FORCE_DEMO !== '1';

let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Local cache keeps the UI usable through brief network drops (DESIGN.md §10).
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}

export { auth, db };
