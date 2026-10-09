import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('admin@campus.edu');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email.trim(), password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10">
        <div className="p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">Room<span className="text-cyan-400">Wise</span></span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Institutional Room Allocation & Disruption System</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated room assignment with hard-constraint validation, allocation optimization, and disruption recovery.
              </p>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>Server-verified authentication and role permissions</span></div>
              <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>Eight fixed institutional role workflows</span></div>
              <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>Disruption recovery and audit trails</span></div>
            </div>
          </div>
          <div className="pt-8 text-[11px] font-mono text-slate-500">RoomWise · Secure institutional access</div>
        </div>

        <div className="p-8 space-y-6 flex flex-col justify-center">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Sign in to RoomWise</h3>
            <p className="text-xs text-slate-400">Use the email and password for your account.</p>
          </div>

          {error && <AlertBanner type="warning" title="Sign-in failed" message={error} onClose={clearError} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-mono text-slate-400">Email address</label>
              <input id="email" type="email" autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="user@campus.edu" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-mono text-slate-400">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2">
              {isLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Demo accounts are created by the development seed script. Use the credentials documented in docs/DEMO_INSTRUCTIONS.md. Role permissions are determined by the server account, not by a role selected in this form.
          </p>
        </div>
      </div>
    </div>
  );
};
