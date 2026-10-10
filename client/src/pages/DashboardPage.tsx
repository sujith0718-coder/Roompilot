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
  ArrowUpRight,
  Sparkles,
  BarChart2,
  Activity,
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
    return <LoadingSpinner label="Loading operational intelligence dashboard..." size="lg" />;
  }

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => !r.isBlocked).length;
  const blockedRooms = rooms.filter((r) => r.isBlocked).length;
  const allocatedBookings = bookings.filter((b) => b.status === 'ALLOCATED').length;
  const approvedBookings = bookings.filter((b) => b.status === 'APPROVED').length;
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);

  // Group rooms by building for utilization overview
  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={['Operations', 'Dashboard']}
        badge={`Role: ${role.replace('_', ' ')}`}
        title={`Welcome back, ${user?.name || 'Administrator'}`}
        description={`Real-time operational dashboard for ${user?.department || 'Institutional Management'}. Control classroom allocation, disruption recovery, and system auditing.`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('bookings')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Booking Request</span>
            </button>
          </div>
        }
      />

      {error && <AlertBanner type="error" title="Data Load Failure" message={error} />}

      {isUsingMockAdapter && (
        <AlertBanner
          type="info"
          title="Development Mock Adapter Active"
          message="Backend API endpoints are operating through local development mock adapters conforming strictly to API_CONTRACTS.md."
        />
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Campus Capacity"
          value={totalCapacity.toLocaleString()}
          subtext={`${totalRooms} Total Rooms (${activeRooms} Active, ${blockedRooms} Blocked)`}
          icon={Building2}
          color="cyan"
          onClick={() => onNavigate('rooms')}
        />
        <StatCard
          title="Active Allocations"
          value={allocatedBookings + approvedBookings}
          subtext={`${pendingBookings} Pending Approval / Queue`}
          icon={CalendarCheck}
          color="emerald"
          onClick={() => onNavigate('timetable')}
        />
        <StatCard
          title="Disruption Status"
          value={blockedRooms > 0 ? `${blockedRooms} Blocked` : '0 Disrupted'}
          subtext="M5 Disruption Recovery Engine Active"
          icon={Zap}
          color={blockedRooms > 0 ? 'rose' : 'amber'}
          onClick={() => onNavigate('recovery')}
        />
        <StatCard
          title="Security RBAC"
          value={role}
          subtext="Express Endpoint Authorization Active"
          icon={ShieldCheck}
          color="purple"
          onClick={() => onNavigate('audit')}
        />
      </div>

      {/* Quick Action Operations Banner */}
      <div className="rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Contextual Role Operations</span>
            </div>
            <h3 className="text-lg font-bold text-white font-sans">
              {role === 'TUTOR' && 'Class-Test & Tutorial Scheduling Workspace'}
              {role === 'STUDENT_REP' && 'Classroom Representative Request Center'}
              {role === 'EVENT_MANAGER' && 'Club & Event Space Manager'}
              {role === 'SECRETARY' && 'Association Request Approval & Oversight'}
              {role === 'HOD' && 'Department Oversight & Heuristic Engine'}
              {role === 'COE' && 'Examination Hall Allocation & Timetable Control'}
              {role === 'PRINCIPAL' && 'Institutional Strategy, Comparison & Security Audit'}
              {role === 'SYSTEM_ADMIN' && 'Full System Operations & M5 Disruption Control'}
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl font-sans leading-relaxed">
              {role === 'SYSTEM_ADMIN'
                ? 'Manage campus rooms, execute M5 Disruption Recovery algorithms, run First-Fit vs Heuristic allocation benchmarks, and inspect security audit logs.'
                : 'Access authorized actions for your department with full server-enforced role restrictions.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('rooms')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <span>Room Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <span>Timetable</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role) && (
              <button
                onClick={() => onNavigate('recovery')}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-mono transition-all flex items-center gap-1.5"
              >
                <span>M5 Disruption</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {['HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role) && (
              <button
                onClick={() => onNavigate('comparison')}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition-all flex items-center gap-1.5"
              >
                <span>Run Heuristics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Building Distribution & Active Closures Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campus Building Capacity Overview */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <span>Campus Building Room Distribution</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{buildings.length} Buildings</span>
          </div>

          <div className="space-y-3 pt-2">
            {buildings.map((building) => {
              const bRooms = rooms.filter((r) => r.building === building);
              const bCap = bRooms.reduce((acc, r) => acc + r.capacity, 0);
              const pct = Math.min(100, Math.round((bCap / totalCapacity) * 100)) || 0;

              return (
                <div key={building} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{building}</span>
                    <span className="text-slate-400">
                      {bRooms.length} Rooms &bull; {bCap} Total Capacity ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Activity & Disruption Snapshot */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Live Audit Activity</span>
            </h3>
            {['PRINCIPAL', 'SYSTEM_ADMIN'].includes(role) && (
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                Full Trail &rarr;
              </button>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold text-cyan-400 truncate max-w-[150px]">{log.action}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] truncate">{log.resource}</p>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <p className="text-xs text-slate-500 italic py-4 text-center">No recent audit log entries.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recent Booking Requests</span>
          </h3>
          <button
            onClick={() => onNavigate('bookings')}
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Bookings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-xs text-white">{booking.title}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Requester: {booking.requesterRole}</span>
                    <span>&bull;</span>
                    <span>Enrollment: {booking.enrollmentCount}</span>
                    <span>&bull;</span>
                    <span>Slot: {booking.slot.dayOfWeek} ({booking.slot.startTime}-{booking.slot.endTime})</span>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <span className="text-slate-300 font-semibold block">
                    {booking.assignedRoomId ? `Room: ${booking.assignedRoomId}` : 'Unassigned Queue'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
