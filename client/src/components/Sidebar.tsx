import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  PlusCircle,
  BarChart3,
  CheckSquare,
  AlertOctagon,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'rooms'
  | 'timetable'
  | 'bookings'
  | 'comparison'
  | 'explanations'
  | 'recovery'
  | 'audit';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  rolesAllowed: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'rooms',
    label: 'Room Availability',
    icon: Building2,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'timetable',
    label: 'Timetable & Allocations',
    icon: CalendarDays,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'bookings',
    label: 'Room Requests',
    icon: PlusCircle,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'comparison',
    label: 'Baseline vs Heuristic',
    icon: BarChart3,
    rolesAllowed: ['HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'Metrics',
  },
  {
    id: 'explanations',
    label: 'Validation & Traces',
    icon: CheckSquare,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'recovery',
    label: 'Disruption & Recovery',
    icon: AlertOctagon,
    rolesAllowed: ['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'Disruption',
  },
  {
    id: 'audit',
    label: 'Reports & Audit Logs',
    icon: FileSpreadsheet,
    rolesAllowed: ['PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'Admin',
  },
];

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'SYSTEM_ADMIN';

  const visibleNavItems = NAV_ITEMS.filter((item) => item.rolesAllowed.includes(currentRole));

  const content = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80">
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Role: {currentRole.replace('_', ' ')}
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />

              {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}

              {!isCollapsed && item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Scope Disclaimer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-500 font-mono space-y-1">
          <p className="text-slate-400 font-semibold">RBAC Scope Active</p>
          <p className="line-clamp-2">Showing actions authorized for {currentRole}.</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block shrink-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-64 max-w-xs bg-slate-950 h-full shadow-2xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
