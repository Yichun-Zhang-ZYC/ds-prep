import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { MIN_PASSWORD_LENGTH } from '../auth/AuthProvider';
import { useAuth } from '../auth/useAuth';
import { LanguageToggle, Logo, ThemeToggle } from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';

export function LoginPage() {
  const { mode, status, error, signInWithGoogle, signInWithPassword, sendPasswordReset } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  if (status === 'authorized') return <Navigate to="/" replace />;
  if (status === 'unauthorized') return <Navigate to="/not-authorized" replace />;

  const onPassword = async (e: FormEvent) => {
    e.preventDefault();
    setNote(null);
    if (!email.trim() || !password) return setNote({ text: t('login.enterBoth'), tone: 'err' });
    setBusy(true);
    await signInWithPassword(email, password);
    setBusy(false);
  };

  const onForgot = async () => {
    if (!email.trim()) return setNote({ text: t('login.enterEmailFirst'), tone: 'err' });
    if (mode === 'demo') return setNote({ text: t('login.demoNoEmail'), tone: 'err' });
    try {
      await sendPasswordReset(email);
      setNote({ text: t('login.resetSent', { email: email.trim() }), tone: 'ok' });
    } catch (err) {
      setNote({ text: t((err as Error).message), tone: 'err' });
    }
  };

  const shownError = note?.tone === 'err' ? note.text : error ? t(error, { n: MIN_PASSWORD_LENGTH }) : null;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="flex justify-end gap-2 p-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <main className="grid place-items-center px-4 pb-16">
        <div className="card grid w-[min(420px,100%)] justify-items-center gap-5 px-7 py-8 text-center">
          <span className="scale-[1.6] py-1.5"><Logo /></span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-bold tracking-tight">DS Prep</h1>
            <p className="text-[15px] text-muted">{t('login.tagline')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {t('login.tracks').split('|').map(track => <span key={track} className="badge">{track}</span>)}
          </div>

          {mode === 'unconfigured' ? (
            <p className="rounded-btn bg-warning-soft p-3 text-sm text-fg">{t('login.unconfigured')}</p>
          ) : (
            <>
              <button className="btn h-11 w-full" onClick={() => signInWithGoogle()}>
                <span aria-hidden="true" className="size-[18px] rounded-full" style={{ background: 'conic-gradient(#EA4335 0 25%, #FBBC05 0 50%, #34A853 0 75%, #4285F4 0)' }} />
                {t(mode === 'demo' ? 'login.googleDemo' : 'login.google')}
              </button>

              <div className="flex w-full items-center gap-3 text-[13px] text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                {t('login.orPassword')}
              </div>

              <form className="grid w-full gap-3 text-left" onSubmit={onPassword} noValidate>
                <label className="grid gap-1 text-[13px] font-medium" htmlFor="login-email">
                  {t('login.email')}
                  <input id="login-email" className="input" type="email" autoComplete="username" placeholder={mode === 'demo' ? 'demo@example.com' : 'you@gmail.com'} value={email} onChange={e => setEmail(e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px] font-medium" htmlFor="login-password">
                  {t('login.password')}
                  <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
                </label>
                {shownError && <p className="text-[13px] text-error" role="alert">{shownError}</p>}
                {note?.tone === 'ok' && <p className="text-[13px] text-success" role="status">{note.text}</p>}
                <button className="btn btn-primary h-11 w-full" type="submit" disabled={busy}>{t(busy ? 'login.signingIn' : 'login.signIn')}</button>
                <div className="flex items-start justify-between gap-3 text-[13px] text-muted">
                  <span>{t('login.noSignup')}</span>
                  <button type="button" className="shrink-0 text-accent hover:underline" onClick={onForgot}>{t('login.forgot')}</button>
                </div>
              </form>
            </>
          )}

          <p className="text-[13px] text-muted">{t(mode === 'demo' ? 'login.demoFooter' : 'login.inviteFooter')}</p>
        </div>
      </main>
    </div>
  );
}
