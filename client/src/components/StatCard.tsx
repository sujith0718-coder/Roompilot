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
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  color = 'cyan',
  onClick,
}) => {
  const styles = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      glow: 'from-cyan-500/5 to-transparent',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      glow: 'from-emerald-500/5 to-transparent',
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      glow: 'from-purple-500/5 to-transparent',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      glow: 'from-amber-500/5 to-transparent',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      glow: 'from-rose-500/5 to-transparent',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      glow: 'from-indigo-500/5 to-transparent',
    },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-md border ${styles.border} p-5 shadow-xl shadow-slate-950/40 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Background Gradient Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.glow} pointer-events-none`} />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-105 ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full ${
              trend.isPositive !== false
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="relative z-10 mt-2 text-xs text-slate-400 font-sans leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
};
