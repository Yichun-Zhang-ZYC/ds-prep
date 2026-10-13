interface Props {
  pct: number;
  label?: string;
  size?: 'default' | 'mini';
  className?: string;
}

/** 8px rounded bar; turns success green at 100% (DESIGN.md §9). */
export function ProgressBar({ pct, label, size = 'default', className = '' }: Props) {
  const done = pct >= 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={`overflow-hidden rounded-full bg-track ${size === 'mini' ? 'h-1 w-18' : 'h-2 w-full'} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${done ? 'bg-success' : 'bg-accent'}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
