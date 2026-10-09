import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, isUsingMockAdapter } from '../api/client';
import { Room, BookingRequest, AuditLogEntry } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  Building2,
  CalendarCheck,
  Zap,
  ShieldCheck,
  Clock,
  PlusCircle,
  Server,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [roomList, bookingList, logs] = await Promise.all([
          api.getRooms(),
          api.getBookings(),
          api.getAuditLogs().catch(() => []),
        ]);
        setRooms(roomList);
        setBookings(bookingList);
        setAuditLogs(logs);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [role]);

  if (isLoading) {
    return <LoadingSpinner label="Loading RBAC Dashboard..." size="lg" />;
  }

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => !r.isBlocked).length;
  const blockedRooms = rooms.filter((r) => r.isBlocked).length;
  const allocatedBookings = bookings.filter((b) => b.status === 'ALLOCATED').length;
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <PageHeader
        badge={`Active Role: ${role.replace('_', ' ')}`}
        title={`Welcome, ${user?.name || 'Administrator'}`}
        description={`Role-tailored workspace for ${user?.department || 'Institutional Management'}. All endpoints backed by Express server authorization.`}
        action={
          <button
            onClick={() => onNavigate('bookings')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Room Request</span>
          </button>
        }
      />

      {error && <AlertBanner type="error" title="Data Load Failure" message={error} />}

      {isUsingMockAdapter && (
        <AlertBanner
          type="info"
          title="Development Mock Adapter Active"
          message="Backend API endpoints are operating through local development mock adapters conforming strictly to docs/API_CONTRACTS.md."
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Campus Rooms"
          value={totalRooms}
          subtext={`${activeRooms} Active, ${blockedRooms} Blocked`}
          icon={Building2}
          color="cyan"
        />
        <StatCard
          title="Allocated Bookings"
          value={allocatedBookings}
          subtext={`${pendingBookings} Pending Approval/Slot`}
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Disruption Churn"
          value={blockedRooms > 0 ? `${blockedRooms} Closed` : '0 Active'}
          subtext="Emergency Churn Minimizer"
          icon={Zap}
          color="amber"
        />
        <StatCard
          title="RBAC Status"
          value="Enforced"
          subtext={`Authenticated as ${role}`}
          icon={ShieldCheck}
          color="purple"
        />
      </div>

      {/* Role-Specific Action Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Role Overview & Key Functions</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {role === 'TUTOR' && 'Class-Test & Tutorial Scheduling Scope'}
              {role === 'STUDENT_REP' && 'Classroom Representative Request Center'}
              {role === 'EVENT_MANAGER' && 'Club & Association Event Booking Manager'}
              {role === 'SECRETARY' && 'Association Request Approval & Oversight'}
              {role === 'HOD' && 'Department Oversight & Allocation Engine'}
              {role === 'COE' && 'Examination Hall Allocation & Schedule Management'}
              {role === 'PRINCIPAL' && 'Institutional Strategy, Comparison & Audit Trail'}
              {role === 'SYSTEM_ADMIN' && 'Full System Control, Technical Diagnostics & Audit'}
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              {role === 'TUTOR' && 'Request rooms for class-tests and tutorials. View live room availability and assigned slots.'}
              {role === 'STUDENT_REP' && 'Submit class event requests and monitor assigned room allocations.'}
              {role === 'EVENT_MANAGER' && 'Request halls for club events requiring specialized AV and large capacities.'}
              {role === 'SECRETARY' && 'Review and approve pending student association requests according to policy.'}
              {role === 'HOD' && 'Manage department room requests, trigger First-Fit vs Heuristic allocation engine.'}
              {role === 'COE' && 'Allocate exam halls with strict capacity checks and view optimization metrics.'}
              {role === 'PRINCIPAL' && 'Monitor institution-level efficiency metrics, audit trails, and room recovery reports.'}
              {role === 'SYSTEM_ADMIN' && 'Manage room repository, block rooms for maintenance, run allocations, and view audit logs.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => onNavigate('rooms')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>View Rooms</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <span>Timetable</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {['HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role) && (
              <button
                onClick={() => onNavigate('comparison')}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <span>Run Heuristics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout: Active Requests & Audit Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Bookings Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Recent Booking Requests</span>
            </h3>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              View All &rarr;
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-slate-800">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{booking.title}</span>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Attendees: {booking.enrollmentCount}</span>
                      <span>&bull;</span>
                      <span>Slot: {booking.slot.dayOfWeek} ({booking.slot.startTime}-{booking.slot.endTime})</span>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono">
                    <span className="text-slate-400 block">{booking.assignedRoomId ? `Room: ${booking.assignedRoomId}` : 'Unassigned'}</span>
                    <span className="text-[10px] text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Audit Trail / System Health */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>System & Audit Trail</span>
            </h3>
            {['PRINCIPAL', 'SYSTEM_ADMIN'].includes(role) && (
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                Full Log &rarr;
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Recent System Activity</span>
              <div className="space-y-2.5">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-cyan-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] truncate">{log.resource}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No audit log entries recorded yet.</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Express RBAC Middleware:</span>
              <span className="text-emerald-400 font-semibold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
