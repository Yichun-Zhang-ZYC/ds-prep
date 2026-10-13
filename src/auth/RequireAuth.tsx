import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ProgressProvider } from '../progress/ProgressProvider';
import { useAuth } from './useAuth';

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-sm text-muted" role="status">
      <div className="flex items-center gap-3">
        <span className="size-4 animate-spin rounded-full border-2 border-track border-t-accent" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}

/** Gate for every route except /login (DESIGN.md §5). Provides progress for the signed-in user. */
export function RequireAuth() {
  const { status, store } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner label="Signing you in…" />;
  if (status === 'unauthorized') return <Navigate to="/not-authorized" replace />;
  if (status === 'signed-out' || !store) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <ProgressProvider store={store}>
      <Outlet />
    </ProgressProvider>
  );
}
