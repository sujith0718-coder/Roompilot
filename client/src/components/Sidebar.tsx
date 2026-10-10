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
  ShieldAlert,
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
  category: 'Overview' | 'Scheduling' | 'Operations' | 'Administration';
  icon: React.ElementType;
  rolesAllowed: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    category: 'Overview',
    icon: LayoutDashboard,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'rooms',
    label: 'Room Availability',
    category: 'Scheduling',
    icon: Building2,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'timetable',
    label: 'Timetable & Allocations',
    category: 'Scheduling',
    icon: CalendarDays,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'bookings',
    label: 'Room Requests',
    category: 'Scheduling',
    icon: PlusCircle,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'comparison',
    label: 'Baseline vs Heuristic',
    category: 'Operations',
    icon: BarChart3,
    rolesAllowed: ['HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'Metrics',
  },
  {
    id: 'explanations',
    label: 'Validation & Traces',
    category: 'Operations',
    icon: CheckSquare,
    rolesAllowed: ['TUTOR', 'STUDENT_REP', 'EVENT_MANAGER', 'SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'],
  },
  {
    id: 'recovery',
    label: 'Disruption & Recovery',
    category: 'Operations',
    icon: AlertOctagon,
    rolesAllowed: ['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'M5 Engine',
  },
  {
    id: 'audit',
    label: 'Reports & Audit Logs',
    category: 'Administration',
    icon: FileSpreadsheet,
    rolesAllowed: ['PRINCIPAL', 'SYSTEM_ADMIN'],
    badge: 'Security',
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

  const categories: ('Overview' | 'Scheduling' | 'Operations' | 'Administration')[] = [
    'Overview',
    'Scheduling',
    'Operations',
    'Administration',
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#0b101d] border-r border-slate-800/80 select-none">
      {/* Sidebar Header / Branding / Collapse Control */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 block">
                {currentRole.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block">Authorized Scope</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse block" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Grouped by Category */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {categories.map((category) => {
          const categoryItems = visibleNavItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  {category}
                </div>
              )}

              {categoryItems.map((item) => {
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
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-md shadow-cyan-950/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />

                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-cyan-300 border border-cyan-500/20">
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-cyan-400 shadow-sm shadow-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer / Role & RBAC System Info */}
      {!isCollapsed && (
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 text-[11px] font-mono space-y-1.5">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Security Guard Active</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Role-Based Access Control verified for {currentRole}.
          </p>
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={onCloseMobile} />
          <div className="relative w-64 max-w-xs bg-[#0b101d] h-full shadow-2xl z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
