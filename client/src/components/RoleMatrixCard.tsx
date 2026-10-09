import React from 'react';
import { UserRole } from '../types';
import { Users } from 'lucide-react';

const ROLES_INFO: { role: UserRole; title: string; desc: string }[] = [
  { role: 'TUTOR', title: 'Tutor', desc: 'Authorized class-test and tutorial room allocation' },
  { role: 'STUDENT_REP', title: 'Student Rep', desc: 'Request and track class allocations; no unrestricted booking' },
  { role: 'EVENT_MANAGER', title: 'Event Manager', desc: 'Request and track authorized club/association events' },
  { role: 'SECRETARY', title: 'Secretary', desc: 'Manage authorized club/association requests and approvals' },
  { role: 'HOD', title: 'HoD', desc: 'Department gatherings and department-level oversight' },
  { role: 'COE', title: 'CoE', desc: 'Examination hall allocation and schedule management' },
  { role: 'PRINCIPAL', title: 'Principal', desc: 'Institution-level oversight and explicitly authorized approvals' },
  { role: 'SYSTEM_ADMIN', title: 'System Admin', desc: 'Accounts, configuration, technical administration and audit logs' },
];

export const RoleMatrixCard: React.FC = () => {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-100">8 Fixed Internal Roles</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES_INFO.map((item) => (
          <div
            key={item.role}
            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors"
          >
            <div className="text-xs font-mono font-semibold text-cyan-400 mb-1">
              {item.role}
            </div>
            <div className="text-sm font-medium text-slate-200 mb-1">{item.title}</div>
            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
