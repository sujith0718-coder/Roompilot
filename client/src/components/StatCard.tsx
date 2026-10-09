import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  color = 'cyan',
}) => {
  const colorMap = {
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-400 bg-cyan-500/10',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400 bg-emerald-500/10',
    purple: 'from-purple-500/10 to-transparent border-purple-500/20 text-purple-400 bg-purple-500/10',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400 bg-amber-500/10',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400 bg-rose-500/10',
    indigo: 'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-400 bg-indigo-500/10',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[color]} bg-slate-900 border border-slate-800 p-5 shadow-xl transition-all duration-300 hover:border-slate-700`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorMap[color].split(' ').pop()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{value}</span>
        {trend && (
          <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-md ${trend.isPositive !== false ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtext && <p className="mt-2 text-xs text-slate-400">{subtext}</p>}
    </div>
  );
};
