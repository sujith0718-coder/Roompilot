import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-cyan-200 to-slate-300 bg-clip-text text-transparent">
              RoomWise
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Smart Classroom Allocation & Disruption Recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>8-Role RBAC Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
