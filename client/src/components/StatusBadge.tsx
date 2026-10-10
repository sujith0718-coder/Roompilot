import React from 'react';
import { BookingStatus, UserRole, Facility, AllocationMethod } from '../types';

interface StatusBadgeProps {
  status?: BookingStatus | string;
  roomStatus?: 'AVAILABLE' | 'BLOCKED';
  role?: UserRole;
  facility?: Facility;
  method?: AllocationMethod;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  roomStatus,
  role,
  facility,
  method,
  variant,
  size = 'sm',
}) => {
  let label = status || roomStatus || role || facility || method || '';
  let colorStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  if (role) {
    label = role.replace('_', ' ');
    switch (role) {
      case 'SYSTEM_ADMIN': colorStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30'; break;
      case 'PRINCIPAL': colorStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/30'; break;
      case 'COE': colorStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30'; break;
      case 'HOD': colorStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'; break;
      case 'SECRETARY': colorStyle = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'; break;
      case 'EVENT_MANAGER': colorStyle = 'bg-teal-500/10 text-teal-400 border-teal-500/30'; break;
      case 'STUDENT_REP': colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'; break;
      case 'TUTOR': colorStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30'; break;
    }
  } else if (status || roomStatus) {
    const activeStatus = status || roomStatus;
    switch (activeStatus) {
      case 'ALLOCATED':
      case 'APPROVED':
      case 'AVAILABLE':
      case 'ACTIVE':
        colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        break;
      case 'PENDING':
      case 'EVALUATING':
        colorStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        break;
      case 'REJECTED':
      case 'BLOCKED':
      case 'CANCELLED':
        colorStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        break;
      default:
        colorStyle = 'bg-slate-800 text-slate-300 border-slate-700';
    }
  } else if (method) {
    colorStyle = method === 'HEURISTIC' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-300 border-slate-700';
  }

  if (variant) {
    switch (variant) {
      case 'success': colorStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'; break;
      case 'warning': colorStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30'; break;
      case 'danger': colorStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30'; break;
      case 'info': colorStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30'; break;
      case 'purple': colorStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/30'; break;
      case 'cyan': colorStyle = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'; break;
      case 'neutral': colorStyle = 'bg-slate-800 text-slate-400 border-slate-700'; break;
    }
  }

  const sizeStyle = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border ${colorStyle} ${sizeStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {label}
    </span>
  );
};
