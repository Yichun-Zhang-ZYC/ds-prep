import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** Native <dialog> as a modal: focus trap, Esc to close and backdrop come for free. */
export function Dialog({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal?.();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-card border border-border bg-bg p-0 text-fg backdrop:bg-black/40"
    >
      <div className="grid gap-4 p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
