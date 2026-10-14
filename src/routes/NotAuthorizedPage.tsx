import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LanguageToggle } from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';

/**
 * Shown when the Firestore allowlist check fails. Two causes look the same to Firestore:
 * the email isn't on the allowlist, or it is but isn't verified yet (e.g. right after
 * linking a password). The second one is fixable here.
 */
export function NotAuthorizedPage() {
  const { status, user, signOut, sendVerification, recheck } = useAuth();
  const { t } = useI18n();
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authorized') return <Navigate to="/" replace />;
  if (status === 'signed-out') return <Navigate to="/login" replace />;

  const email = user?.email ?? t('notAuth.unknown');
  const unverified = !!user && !user.emailVerified;

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="card grid w-[min(460px,100%)] justify-items-center gap-4 px-7 py-8 text-center">
        <LanguageToggle />
        <span className="size-11 rounded-full border-[3px] border-warning" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">{t(unverified ? 'notAuth.unverifiedTitle' : 'notAuth.title')}</h1>
        {unverified ? (
          <>
            <p className="text-[15px] text-muted">{t('notAuth.unverifiedBody', { email })}</p>
            <div className="grid w-full gap-2">
              <button
                className="btn btn-primary h-11 w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setNote(null);
                  await recheck();
                  setBusy(false);
                }}
              >
                {t(busy ? 'notAuth.checking' : 'notAuth.recheck')}
              </button>
              <button
                className="btn h-11 w-full"
                onClick={async () => {
                  try {
                    await sendVerification();
                    setNote({ text: t('notAuth.sent'), tone: 'ok' });
                  } catch (e) {
                    setNote({ text: t((e as Error).message), tone: 'err' });
                  }
                }}
              >
                {t('notAuth.resend')}
              </button>
            </div>
            {note && <p className={`text-[13px] ${note.tone === 'ok' ? 'text-success' : 'text-error'}`} role="status">{note.text}</p>}
          </>
        ) : (
          <>
            <p className="text-[15px] text-muted">{t('notAuth.signedInAs', { email })}</p>
            <p className="text-[15px] text-muted">{t('notAuth.ask')}</p>
          </>
        )}
        <button className="btn h-11 w-full" onClick={() => signOut()}>{t('notAuth.signOut')}</button>
        {user && (
          <p className="break-all text-xs text-muted">
            {t('notAuth.details', { email: user.email, verified: user.emailVerified ? '✓' : '✗', method: user.signInMethod || '?' })}
          </p>
        )}
      </div>
    </main>
  );
}
