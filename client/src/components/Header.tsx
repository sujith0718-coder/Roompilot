import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { isUsingMockAdapter } from '../api/client';
import { ALL_USER_ROLES, UserRole } from '../types';
import { Shield, LogOut, ChevronDown, UserCheck, Menu, Database } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout, loginAsRole } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

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

        {/* Right Side: Role Selector, Connection Indicator & User Controls */}
        <div className="flex items-center gap-3">
          {/* Adapter Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode:</span>
            <span className={isUsingMockAdapter ? 'text-amber-400' : 'text-emerald-400'}>
              {isUsingMockAdapter ? 'Dev Mock Adapter' : 'Live Express API'}
            </span>
          </div>

          {/* Role Switcher Dropdown for Testing */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Switch Role:</span>
                <StatusBadge role={user.role} size="sm" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-[10px] font-mono text-slate-400 uppercase border-b border-slate-800">
                    Switch Active RBAC Role
                  </div>
                  <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
                    {ALL_USER_ROLES.map((r: UserRole) => (
                      <button
                        key={r}
                        onClick={() => {
                          loginAsRole(r);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                          user.role === r ? 'bg-cyan-500/10 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{r}</span>
                        {user.role === r && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
