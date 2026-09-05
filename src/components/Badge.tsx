import type { ReactNode } from 'react';

export function Badge({
  children,
  color = 'gray',
  icon,
}: {
  children: ReactNode;
  color?: 'gray' | 'green' | 'red' | 'blue' | 'amber' | 'purple';
  icon?: ReactNode;
}) {
  const colors: Record<string, string> = {
    gray: 'bg-ink-100 text-ink-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`badge ${colors[color]}`}>
      {icon}
      {children}
    </span>
  );
}
