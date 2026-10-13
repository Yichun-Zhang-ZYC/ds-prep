/**
 * Firebase web app config. These values are public by design: security comes from
 * firestore.rules + the email allowlist (DESIGN.md §8).
 *
 * Paste the config from Firebase Console → Project settings → Your apps → Web app.
 * While apiKey is empty, `npm run dev` runs in demo mode (local fake sign-in,
 * progress saved in this browser only).
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
