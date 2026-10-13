/**
 * Firebase web app config. These values are public by design: security comes from
 * firestore.rules + the email allowlist (DESIGN.md §8).
 *
 * Paste the config from Firebase Console → Project settings → Your apps → Web app.
 * Clear apiKey to run `npm run dev` in demo mode (local fake sign-in, progress
 * saved in this browser only).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAbbovVnXGfJmFFSpRUR3k5Rt4j3VfwOnc',
  authDomain: 'ds-prep-bc295.firebaseapp.com',
  projectId: 'ds-prep-bc295',
  storageBucket: 'ds-prep-bc295.firebasestorage.app',
  messagingSenderId: '358837503759',
  appId: '1:358837503759:web:dbdac4536f6d8a9b32207a',
};
