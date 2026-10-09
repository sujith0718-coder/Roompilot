import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

interface AlertBannerProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  action?: React.ReactNode;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  action,
}) => {
  const config = {
    error: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      icon: XCircle,
      iconColor: 'text-rose-400',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    info: {
      bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
      icon: Info,
      iconColor: 'text-cyan-400',
    },
  };

  const current = config[type];
  const Icon = current.icon;

  return (
    <div className={`p-4 rounded-xl border ${current.bg} flex items-start gap-3 relative shadow-md`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 space-y-1">
        {title && <h4 className="text-sm font-semibold tracking-wide">{title}</h4>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
        {action && <div className="pt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
