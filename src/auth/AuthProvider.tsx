import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { auth, db, firebaseEnabled } from '../firebase';
import { createFirestoreStore } from '../progress/firestoreStore';
import { createMockStore } from '../progress/mockStore';
import type { ProgressStore } from '../progress/types';

export type AuthMode = 'firebase' | 'demo' | 'unconfigured';
export type AuthStatus = 'loading' | 'signed-out' | 'authorized' | 'unauthorized';

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  hasPassword: boolean;
}

export interface AuthContextValue {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  store: ProgressStore | null;
  /** i18n key of the message to show on the login page after a failed sign-in attempt. */
  error: string | null;
  signInWithGoogle(): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Links a password to the current account (or changes it). Same uid either way. Throws Error(i18nKey). */
  setPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const MIN_PASSWORD_LENGTH = 8;

const mode: AuthMode = firebaseEnabled ? 'firebase' : import.meta.env.DEV ? 'demo' : 'unconfigured';

/** Maps Firebase errors to i18n keys (see src/i18n/strings.ts, "auth.*"). */
function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'auth.badCredentials';
    case 'auth/too-many-requests':
      return 'auth.tooMany';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'auth.popupClosed';
    case 'auth/popup-blocked':
      return 'auth.popupBlocked';
    case 'auth/unauthorized-domain':
      return 'auth.unauthorizedDomain';
    case 'auth/weak-password':
      return 'auth.weakPassword';
    case 'auth/network-request-failed':
      return 'auth.network';
    case 'auth/operation-not-allowed':
      return 'auth.passwordDisabled';
    default:
      console.error(e);
      return 'auth.generic';
  }
}

const toAuthUser = (u: User): AuthUser => ({
  uid: u.uid,
  displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Learner',
  email: u.email ?? '',
  photoURL: u.photoURL ?? '',
  hasPassword: u.providerData.some(p => p.providerId === 'password'),
});

// ---------- Demo mode (no Firebase config, dev server only) ----------

const DEMO_SESSION = 'dsprep-demo-session';
const DEMO_PW = 'dsprep-demo-password-sha256';
const DEMO_USER: Omit<AuthUser, 'hasPassword'> = {
  uid: 'demo',
  displayName: 'Demo Learner',
  email: 'demo@example.com',
  photoURL: '',
};

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Provider ----------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<ProgressStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Firebase: react to sign-in state, then probe the allowlist by reading our own user doc.
  useEffect(() => {
    if (mode !== 'firebase' || !auth || !db) return;
    const firestore = db;
    return onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        setUser(null);
        setStore(null);
        setStatus('signed-out');
        return;
      }
      setStatus('loading');
      const u = toAuthUser(fbUser);
      const s = createFirestoreStore(firestore, u.uid);
      try {
        const existing = await s.getUser();
        if (!existing) {
          await s.updateUser({ displayName: u.displayName, email: u.email, photoURL: u.photoURL, targetRole: null, lastLessonId: null, createdAt: Date.now() });
        } else if (existing.displayName !== u.displayName || existing.photoURL !== u.photoURL) {
          await s.updateUser({ displayName: u.displayName, photoURL: u.photoURL });
        }
        setUser(u);
        setStore(s);
        setError(null);
        setStatus('authorized');
      } catch (e) {
        if ((e as { code?: string }).code === 'permission-denied') {
          setUser(u);
          setStore(null);
          setStatus('unauthorized');
        } else {
          console.error(e);
          setError(friendlyAuthError(e));
          setUser(null);
          setStatus('signed-out');
        }
      }
    });
  }, []);

  // Demo: restore the fake session.
  useEffect(() => {
    if (mode !== 'demo') {
      if (mode === 'unconfigured') setStatus('signed-out');
      return;
    }
    if (ls.get(DEMO_SESSION)) {
      setUser({ ...DEMO_USER, hasPassword: !!ls.get(DEMO_PW) });
      setStore(createMockStore(DEMO_USER.uid, { displayName: DEMO_USER.displayName, email: DEMO_USER.email }));
      setStatus('authorized');
    } else {
      setStatus('signed-out');
    }
  }, []);

  const startDemoSession = useCallback(() => {
    ls.set(DEMO_SESSION, '1');
    setUser({ ...DEMO_USER, hasPassword: !!ls.get(DEMO_PW) });
    setStore(createMockStore(DEMO_USER.uid, { displayName: DEMO_USER.displayName, email: DEMO_USER.email }));
    setError(null);
    setStatus('authorized');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (mode === 'demo') return startDemoSession();
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }, [startDemoSession]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setError(null);
    if (mode === 'demo') {
      const stored = ls.get(DEMO_PW);
      if (stored && email.trim().toLowerCase() === DEMO_USER.email && (await sha256(password)) === stored) return startDemoSession();
      setError('auth.badCredentials');
      return;
    }
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }, [startDemoSession]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (mode !== 'firebase' || !auth) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      // Don't reveal whether the address exists; only surface real failures.
      const code = (e as { code?: string }).code;
      if (code !== 'auth/user-not-found' && code !== 'auth/invalid-email') throw new Error(friendlyAuthError(e));
    }
  }, []);

  const setPassword = useCallback(async (password: string) => {
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error('auth.weakPassword');
    if (mode === 'demo') {
      ls.set(DEMO_PW, await sha256(password));
      setUser(u => (u ? { ...u, hasPassword: true } : u));
      return;
    }
    const current = auth?.currentUser;
    if (!current || !current.email) throw new Error('auth.signInAgain');
    const run = () =>
      current.providerData.some(p => p.providerId === 'password')
        ? updatePassword(current, password)
        : linkWithCredential(current, EmailAuthProvider.credential(current.email!, password));
    try {
      await run();
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/requires-recent-login') throw new Error(friendlyAuthError(e));
      // Firebase wants a fresh sign-in for sensitive changes: confirm with Google, then retry once.
      try {
        await reauthenticateWithPopup(current, new GoogleAuthProvider());
        await run();
      } catch (e2) {
        throw new Error(friendlyAuthError(e2));
      }
    }
    await current.reload();
    setUser(toAuthUser(auth!.currentUser ?? current));
  }, []);

  const signOut = useCallback(async () => {
    if (mode === 'demo') {
      ls.del(DEMO_SESSION);
      setUser(null);
      setStore(null);
      setStatus('signed-out');
      return;
    }
    if (auth) await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, status, user, store, error, signInWithGoogle, signInWithPassword, sendPasswordReset, setPassword, signOut }),
    [status, user, store, error, signInWithGoogle, signInWithPassword, sendPasswordReset, setPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
