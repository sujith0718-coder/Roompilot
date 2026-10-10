import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  breadcrumbs?: string[];
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  breadcrumbs,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                <span className={idx === breadcrumbs.length - 1 ? 'text-cyan-400 font-medium' : 'text-slate-400'}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 shadow-sm shadow-cyan-950/20">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {badge}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed font-sans">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};
