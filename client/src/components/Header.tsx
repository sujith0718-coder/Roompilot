import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { isUsingMockAdapter } from '../api/client';
import { Shield, LogOut, UserCheck, Menu, Database } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Side: Mobile Menu & Branding */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg tracking-tight font-sans">
                  Room<span className="text-cyan-400">Wise</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Smart Classroom & Disruption Recovery</p>
            </div>
          </div>
        </div>

        {/* Right Side: Role Display, Connection Indicator & User Controls */}
        <div className="flex items-center gap-3">
          {/* Adapter Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode:</span>
            <span className={isUsingMockAdapter ? 'text-amber-400' : 'text-emerald-400'}>
              {isUsingMockAdapter ? 'Dev Mock Adapter' : 'Live Express API'}
            </span>
          </div>

          {/* Active User Role Display */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Active Role:</span>
              <StatusBadge role={user.role} size="sm" />
            </div>
          )}

          {/* User Profile & Logout */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-white">{user.name}</p>
                <p className="text-[10px] font-mono text-slate-400">{user.department || user.email}</p>
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
