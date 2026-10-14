import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LanguageToggle } from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';

export function NotAuthorizedPage() {
  const { status, user, signOut } = useAuth();
  const { t } = useI18n();
  if (status === 'authorized') return <Navigate to="/" replace />;
  if (status === 'signed-out') return <Navigate to="/login" replace />;
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="card grid w-[min(440px,100%)] justify-items-center gap-4 px-7 py-8 text-center">
        <LanguageToggle />
        <span className="size-11 rounded-full border-[3px] border-warning" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">{t('notAuth.title')}</h1>
        <p className="text-[15px] text-muted">{t('notAuth.signedInAs', { email: user?.email ?? t('notAuth.unknown') })}</p>
        <p className="text-[15px] text-muted">{t('notAuth.ask')}</p>
        <button className="btn h-11 w-full" onClick={() => signOut()}>{t('notAuth.signOut')}</button>
      </div>
    </main>
  );
}
