import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useI18n } from '../../i18n/useI18n';
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
  const { t } = useI18n();
  const label = t(theme === 'dark' ? 'header.toLight' : 'header.toDark');
  return (
    <button onClick={toggle} className="grid size-9 place-items-center rounded-btn border border-border hover:bg-surface" aria-label={label} title={label}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

/** Generic segmented control used for the language switches. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'sm',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-btn border border-border bg-surface p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-[6px] font-medium transition-colors ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]'} ${
            value === o.value ? 'bg-bg text-fg shadow-sm' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Interface language: English / 中文 (every page). */
export function LanguageToggle() {
  const { ui, setUi, t } = useI18n();
  return (
    <Segmented
      label={t('header.language')}
      value={ui}
      onChange={setUi}
      options={[
        { value: 'en', label: 'EN' },
        { value: 'zh', label: '中文' },
      ]}
    />
  );
}

export function Header({ onOpenOutline }: { onOpenOutline?: () => void }) {
  const { mode } = useAuth();
  const { t } = useI18n();
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-[1160px] items-center gap-2 px-4 sm:gap-3">
        {onOpenOutline && (
          <button onClick={onOpenOutline} className="grid size-9 shrink-0 place-items-center rounded-btn border border-border hover:bg-surface lg:hidden" aria-label={t('header.openOutline')}>
            ☰
          </button>
        )}
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight" aria-label={t('header.home')}>
          <Logo />
          <span className="hidden sm:inline">DS Prep</span>
        </Link>
        {mode === 'demo' && (
          <span className="badge hidden bg-warning-soft text-warning sm:inline-flex" title={t('header.demoModeTitle')}>
            {t('header.demoMode')}
          </span>
        )}
        <span className="flex-1" />
        <LanguageToggle />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
