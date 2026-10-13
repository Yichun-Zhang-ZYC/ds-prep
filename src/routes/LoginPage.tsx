import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Logo, ThemeToggle } from '../components/layout/Header';

const TRACKS = ['SQL', 'Probability', 'A/B Testing', 'ML', 'LLMs', 'System Design'];

export function LoginPage() {
  const { mode, status, error, signInWithGoogle, signInWithPassword, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  if (status === 'authorized') return <Navigate to="/" replace />;
  if (status === 'unauthorized') return <Navigate to="/not-authorized" replace />;

  const onPassword = async (e: FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (!email.trim() || !password) return setNote({ text: 'Enter your email and password.', tone: 'err' });
    setBusy(true);
    await signInWithPassword(email, password);
    setBusy(false);
  };

  const onForgot = async () => {
    if (!email.trim()) return setNote({ text: 'Enter your email above first, then click "Forgot password?".', tone: 'err' });
    if (mode === 'demo') return setNote({ text: 'Demo mode has no email. Sign in with the demo Google button and set a new password.', tone: 'err' });
    try {
      await sendPasswordReset(email);
      setNote({ text: `If ${email.trim()} has a password, a reset link is on its way.`, tone: 'ok' });
    } catch (err) {
      setNote({ text: (err as Error).message, tone: 'err' });
    }
  };

  const shownError = note?.tone === 'err' ? note.text : error;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="grid place-items-center px-4 pb-16">
        <div className="card grid w-[min(420px,100%)] justify-items-center gap-5 px-7 py-8 text-center">
          <span className="scale-[1.6] py-1.5"><Logo /></span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-bold tracking-tight">DS Prep</h1>
            <p className="text-[15px] text-muted">
              Interview prep for our study group: SQL, stats, ML, LLMs and more, with quizzes and runnable exercises.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TRACKS.map(t => <span key={t} className="badge">{t}</span>)}
          </div>

          {mode === 'unconfigured' ? (
            <p className="rounded-btn bg-warning-soft p-3 text-sm text-fg">
              Sign-in isn't set up yet. Add the Firebase web config to <code className="font-mono">src/firebase.config.ts</code> and redeploy.
            </p>
          ) : (
            <>
              <button className="btn h-11 w-full" onClick={() => signInWithGoogle()}>
                <span aria-hidden="true" className="size-[18px] rounded-full" style={{ background: 'conic-gradient(#EA4335 0 25%, #FBBC05 0 50%, #34A853 0 75%, #4285F4 0)' }} />
                {mode === 'demo' ? 'Sign in with Google (demo)' : 'Sign in with Google'}
              </button>

              <div className="flex w-full items-center gap-3 text-[13px] text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                or sign in with password
              </div>

              <form className="grid w-full gap-3 text-left" onSubmit={onPassword} noValidate>
                <label className="grid gap-1 text-[13px] font-medium" htmlFor="login-email">
                  Email
                  <input id="login-email" className="input" type="email" autoComplete="username" placeholder={mode === 'demo' ? 'demo@example.com' : 'you@gmail.com'} value={email} onChange={e => setEmail(e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px] font-medium" htmlFor="login-password">
                  Password
                  <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
                </label>
                {shownError && <p className="text-[13px] text-error" role="alert">{shownError}</p>}
                {note?.tone === 'ok' && <p className="text-[13px] text-success" role="status">{note.text}</p>}
                <button className="btn btn-primary h-11 w-full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
                <div className="flex items-start justify-between gap-3 text-[13px] text-muted">
                  <span>No sign-up. Set a password from the account menu after signing in with Google.</span>
                  <button type="button" className="shrink-0 text-accent hover:underline" onClick={onForgot}>Forgot password?</button>
                </div>
              </form>
            </>
          )}

          <p className="text-[13px] text-muted">
            {mode === 'demo'
              ? 'Demo mode: Firebase isn’t configured yet, so sign-in is simulated and progress stays in this browser.'
              : 'Invite only. Your email must be on the group’s allowlist.'}
          </p>
        </div>
      </main>
    </div>
  );
}
