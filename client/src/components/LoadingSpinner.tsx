import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label = 'Loading data...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
      <Loader2 className={`animate-spin text-cyan-400 ${sizeMap[size]}`} />
      {label && <span className="text-xs font-mono">{label}</span>}
    </div>
  );
};
