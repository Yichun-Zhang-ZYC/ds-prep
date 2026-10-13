import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function NotAuthorizedPage() {
  const { status, user, signOut } = useAuth();
  if (status === 'authorized') return <Navigate to="/" replace />;
  if (status === 'signed-out') return <Navigate to="/login" replace />;
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="card grid w-[min(440px,100%)] justify-items-center gap-4 px-7 py-8 text-center">
        <span className="size-11 rounded-full border-[3px] border-warning" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight">This account isn’t on the list</h1>
        <p className="text-[15px] text-muted">
          You signed in as <b className="text-fg">{user?.email ?? 'an unknown account'}</b>. DS Prep is limited to study-group members.
        </p>
        <p className="text-[15px] text-muted">Ask the group admin to add this email to the allowlist, then sign in again.</p>
        <button className="btn h-11 w-full" onClick={() => signOut()}>Sign out and use another account</button>
      </div>
    </main>
  );
}
