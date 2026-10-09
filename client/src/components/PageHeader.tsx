import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
      <div className="space-y-1">
        {badge && (
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400">
            {badge}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="text-sm text-slate-400 max-w-3xl">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};
