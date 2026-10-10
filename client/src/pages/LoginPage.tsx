import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';

const DEMO_ACCOUNTS = [
  { role: 'SYSTEM_ADMIN', email: 'admin@campus.edu', pass: 'DemoPass2026!', label: 'System Admin' },
  { role: 'HOD', email: 'hod.cs@campus.edu', pass: 'DemoPass2026!', label: 'HOD CS' },
  { role: 'SECRETARY', email: 'sec.arts@campus.edu', pass: 'DemoPass2026!', label: 'Secretary' },
  { role: 'TUTOR', email: 'tutor.smith@campus.edu', pass: 'DemoPass2026!', label: 'Tutor' },
];

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('admin@campus.edu');
  const [password, setPassword] = useState('DemoPass2026!');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email.trim(), password);
  };

  const handleSelectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (error) clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a12] p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in">
        {/* Left Hero Section */}
        <div className="p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight">
                  Room<span className="text-cyan-400">Wise</span>
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  Pro v1.0
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Smart Classroom & Disruption Operations Platform
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Automated room allocation with hard-constraint validation, constrained heuristic optimization, and M5 emergency disruption recovery.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Express backend authorization & JWT validation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Eight internal institutional RBAC role workflows</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>M5 Disruption Recovery engine & immutable audit log</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] font-mono text-slate-500">
            RoomWise &bull; Enterprise Campus Operations Architecture
          </div>
        </div>

        {/* Right Form Section */}
        <div className="p-8 space-y-6 flex flex-col justify-center bg-slate-950/40">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Sign in to RoomWise</h3>
            <p className="text-xs text-slate-400">Select a demo account role or enter your credentials.</p>
          </div>

          {/* Demo Account Quick-Fill Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Quick Demo Accounts
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc.email, acc.pass)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all border ${
                    email === acc.email
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {error && <AlertBanner type="warning" title="Sign-in failed" message={error} onClose={clearError} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-mono text-slate-400">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors font-sans"
                placeholder="user@campus.edu"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-mono text-slate-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors font-sans"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>Sign In To Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] leading-relaxed text-slate-500 font-sans">
            Demo accounts are populated by the database seeder (`DemoPass2026!`). Server authorization verifies JWT and role scope on every API request.
          </p>
        </div>
      </div>
    </div>
  );
};
