import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ALL_USER_ROLES } from '../types';
import { Shield, ArrowRight, CheckCircle2, Lock, UserCheck } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';

export const LoginPage: React.FC = () => {
  const { login, loginAsRole, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('admin@campus.edu');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SYSTEM_ADMIN');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, selectedRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10">
        {/* Left Info Panel */}
        <div className="p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Room<span className="text-cyan-400">Wise</span>
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Institutional Room Allocation & Disruption System</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated room assignment engine with hard constraint validation, First-Fit baseline, improved heuristics, and disruption churn minimization.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strict Express Server RBAC Enforcement</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>8 Fixed Institutional Role Workflows</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Disruption Recovery & Audit Trails</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] font-mono text-slate-500">
            RoomWise Security & Authoritative State Enforced
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 space-y-6 flex flex-col justify-center">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Sign In to Dashboard</h3>
            <p className="text-xs text-slate-400">Enter your credentials or select an instant demo role</p>
          </div>

          {error && (
            <AlertBanner type="warning" title="Authentication Notice" message={error} onClose={clearError} />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="user@campus.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Target Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {ALL_USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Instant Quick Launch by Role:</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALL_USER_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => loginAsRole(r)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-colors text-left flex items-center justify-between group"
                >
                  <span className="truncate">{r.replace('_', ' ')}</span>
                  <Lock className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
