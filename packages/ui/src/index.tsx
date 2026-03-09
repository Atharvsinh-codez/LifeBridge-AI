import { clsx } from 'clsx';
import type { HTMLAttributes, PropsWithChildren } from 'react';

export function SectionCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'border-2 border-theme-black bg-theme-white p-6 shadow-[8px_8px_0_var(--theme-red)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[12px_12px_0_var(--theme-red)]',
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: PropsWithChildren<{ tone?: 'neutral' | 'warning' | 'critical' | 'success' }>) {
  const toneClass =
    tone === 'critical'
      ? 'border-theme-red bg-theme-red text-theme-white'
      : tone === 'success'
        ? 'border-theme-black bg-theme-black text-theme-white'
        : 'border-theme-black bg-theme-white text-theme-black';

  return (
    <span
      className={clsx(
        'inline-flex border-2 px-3 py-1 font-pixel text-[10px] uppercase tracking-widest',
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <SectionCard className={clsx('space-y-2', className)}>
      <p className="font-pixel text-[10px] uppercase tracking-widest text-theme-black/70">{label}</p>
      <p className="font-pixel text-4xl text-theme-red">{value}</p>
    </SectionCard>
  );
}

export function PrimaryActionButton({
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-14 items-center justify-center border-2 border-theme-black bg-theme-red px-8 font-pixel text-sm uppercase tracking-widest text-theme-white shadow-[4px_4px_0_var(--theme-black)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--theme-black)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        className,
      )}
      {...props}
    />
  );
}
