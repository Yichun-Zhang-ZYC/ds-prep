import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH } from '../../auth/AuthProvider';
import { useAuth } from '../../auth/useAuth';
import { useI18n } from '../../i18n/useI18n';
import { useProgress } from '../../progress/useProgress';
import { useToast } from '../Toast';
import { Dialog } from './Dialog';

export function Avatar({ name, photoURL, size = 32 }: { name: string; photoURL?: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';
  if (photoURL)
    return <img src={photoURL} alt="" referrerPolicy="no-referrer" className="rounded-full border border-border object-cover" style={{ width: size, height: size }} />;
  return (
    <span aria-hidden="true" className="grid place-items-center rounded-full border border-border bg-surface-2 text-xs font-semibold" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

/** Header account menu: Set / Change password (DESIGN.md §8.3), Reset progress, Sign out. */
export function AccountMenu() {
  const { user, mode, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<'password' | 'reset' | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const item = 'w-full rounded-btn px-2.5 py-2 text-left text-sm hover:bg-surface';

  return (
    <div className="relative" ref={wrap}>
      <button
        className="flex items-center gap-2 rounded-btn p-1 text-sm hover:bg-surface"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Avatar name={user.displayName} photoURL={user.photoURL} />
        <span className="hidden font-medium md:inline">{user.displayName}</span>
        <span className="text-muted" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 grid w-64 rounded-card border border-border bg-bg p-1.5 shadow-xl">
          <div className="mb-1 grid gap-1.5 border-b border-border p-2.5 text-[13px]">
            <b className="text-sm">{user.displayName}</b>
            <span className="truncate text-muted">{user.email}</span>
            <span className="flex flex-wrap gap-1.5">
              <span className="badge">{t(mode === 'demo' ? 'account.demo' : 'account.google')}</span>
              <span className={`badge ${user.hasPassword ? 'bg-success-soft text-success' : ''}`}>{t(user.hasPassword ? 'account.passwordSet' : 'account.noPassword')}</span>
            </span>
          </div>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); setDialog('password'); }}>
            {t(user.hasPassword ? 'account.changePassword' : 'account.setPassword')}
          </button>
          <button role="menuitem" className={`${item} text-error`} onClick={() => { setOpen(false); setDialog('reset'); }}>
            {t('account.resetProgress')}
          </button>
          <button role="menuitem" className={item} onClick={() => signOut()}>
            {t('account.signOut')}
          </button>
        </div>
      )}
      {dialog === 'password' && <PasswordDialog onClose={() => setDialog(null)} />}
      {dialog === 'reset' && <ResetDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function PasswordDialog({ onClose }: { onClose(): void }) {
  const { user, setPassword } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changing = !!user?.hasPassword;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw1.length < MIN_PASSWORD_LENGTH) return setError(t('auth.weakPassword', { n: MIN_PASSWORD_LENGTH }));
    if (pw1 !== pw2) return setError(t('password.mismatch'));
    setBusy(true);
    setError(null);
    try {
      await setPassword(pw1);
      toast(t(changing ? 'password.toastChanged' : 'password.toastSet'));
      onClose();
    } catch (err) {
      setError(t((err as Error).message, { n: MIN_PASSWORD_LENGTH }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={t(changing ? 'password.titleChange' : 'password.titleSet')} onClose={onClose}>
      <form className="grid gap-3.5" onSubmit={submit}>
        <p className="text-sm text-muted">
          {t('password.explainBefore')} <b className="text-fg">{user?.email}</b> {t('password.explainAfter')}
        </p>
        <label className="grid gap-1 text-[13px] font-medium" htmlFor="pw-new">
          {t('password.new')}
          <input id="pw-new" className="input" type="password" autoComplete="new-password" value={pw1} onChange={e => setPw1(e.target.value)} autoFocus />
        </label>
        <label className="grid gap-1 text-[13px] font-medium" htmlFor="pw-confirm">
          {t('password.confirm')}
          <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />
        </label>
        {error && <p className="text-[13px] text-error" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-sm" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{t(busy ? 'password.saving' : 'password.save')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetDialog({ onClose }: { onClose(): void }) {
  const { resetProgress } = useProgress();
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={t('reset.title')} onClose={onClose}>
      <p className="text-sm text-muted">{t('reset.body')}</p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-sm" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn btn-danger btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await resetProgress();
              toast(t('reset.done'));
              onClose();
            } catch {
              toast(t('reset.failed'), 'error');
              setBusy(false);
            }
          }}
        >
          {t(busy ? 'reset.busy' : 'reset.confirm')}
        </button>
      </div>
    </Dialog>
  );
}
