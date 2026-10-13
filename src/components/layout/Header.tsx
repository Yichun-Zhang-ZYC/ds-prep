import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useTheme } from '../../theme';
import { AccountMenu } from './AccountMenu';

export function Logo() {
  return (
    <span className="grid size-[26px] place-items-center rounded-[7px] bg-accent font-mono text-xs font-medium text-on-accent" aria-hidden="true">
      ds
    </span>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="grid size-9 place-items-center rounded-btn border border-border hover:bg-surface"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

export function Header({ onOpenOutline }: { onOpenOutline?: () => void }) {
  const { mode } = useAuth();
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-[1160px] items-center gap-3 px-4">
        {onOpenOutline && (
          <button onClick={onOpenOutline} className="grid size-9 place-items-center rounded-btn border border-border hover:bg-surface lg:hidden" aria-label="Open lesson outline">
            ☰
          </button>
        )}
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Logo />
          DS Prep
        </Link>
        {mode === 'demo' && <span className="badge bg-warning-soft text-warning" title="No Firebase config yet: progress is saved in this browser only">Demo mode</span>}
        <span className="flex-1" />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
