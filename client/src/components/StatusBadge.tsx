import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'info' }) => {
  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {status}
    </span>
  );
};
