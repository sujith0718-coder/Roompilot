import React, { useEffect, useState } from 'react';
import { RoleMatrixCard } from '../components/RoleMatrixCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api/client';
import { Server, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<{ status: string; dbStatus: string; uptime: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message || 'Could not connect to backend server'));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Layers className="w-64 h-64 text-cyan-400" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <span>Phase 1 Foundation Operational</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Smart Classroom Allocation & Disruption Recovery
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            RoomWise allocates physical rooms to scheduled occurrences, examinations, department gatherings, and club events based on hard constraint validation, First-Fit baseline, improved heuristics, and disruption recovery.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Independent Validator</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Baseline vs Heuristic</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Disruption Churn Minimization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Diagnostics Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-slate-100">System Diagnostics</h2>
          </div>
          {health ? (
            <StatusBadge status="API Connected" variant="success" />
          ) : error ? (
            <StatusBadge status="Disconnected" variant="danger" />
          ) : (
            <StatusBadge status="Checking..." variant="warning" />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Backend Server</span>
            <span className="text-slate-200 font-semibold">{health ? health.status : 'Offline'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">MongoDB Database</span>
            <span className="text-slate-200 font-semibold">{health ? health.dbStatus : 'Offline'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Uptime</span>
            <span className="text-slate-200 font-semibold">{health ? `${Math.floor(health.uptime)}s` : 'N/A'}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Role Matrix */}
      <RoleMatrixCard />
    </div>
  );
};
