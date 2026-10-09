import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Room, RecoveryReport } from '../types';
import { PageHeader } from '../components/PageHeader';
import { AlertBanner } from '../components/AlertBanner';
import {
  AlertOctagon,
  ShieldAlert,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const DisruptionRecoveryPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reason, setReason] = useState<string>('Emergency HVAC repair and pipe leak');
  const [report, setReport] = useState<RecoveryReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const recoveryReport = await api.closeRoomAndRecover(selectedRoomId, reason);
      setReport(recoveryReport);
      await loadRooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recovery algorithm failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthorized = ['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Room Closure & Disruption Recovery"
        description="Emergency disruption handling engine. Closes broken facilities and re-allocates affected bookings while minimizing schedule churn."
        badge="Churn Minimization Engine"
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trigger Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 h-fit">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Emergency Room Closure</h3>
              <p className="text-xs text-slate-400">Trigger disruption recovery</p>
            </div>
          </div>

          {!isAuthorized && (
            <AlertBanner
              type="warning"
              title="Restricted Access"
              message={`Role ${role} does not have authorization to trigger room closures.`}
            />
          )}

          <form onSubmit={handleExecuteRecovery} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Select Room to Close</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={!isAuthorized || isLoading}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name} ({r.isBlocked ? 'Already Blocked' : 'Active'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Disruption Reason</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isAuthorized}
                placeholder="e.g. Electrical failure, Water leak"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={!isAuthorized || isSubmitting || !selectedRoomId}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Execute Recovery</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recovery Report Summary */}
        <div className="lg:col-span-2 space-y-6">
          {report ? (
            <>
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Disruption Recovery Report</h3>
                      <p className="text-xs text-slate-400 font-mono">Room ID: {report.closedRoomId}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                    RECOVERY COMPLETE
                  </span>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                    <span className="text-[10px] text-slate-500 block">Affected Bookings</span>
                    <span className="text-amber-400 font-bold text-lg">{report.affectedBookingIds.length}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                    <span className="text-[10px] text-slate-500 block">Reassigned</span>
                    <span className="text-emerald-400 font-bold text-lg">{report.reassignedBookings.length}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                    <span className="text-[10px] text-slate-500 block">Unaffected Preserved</span>
                    <span className="text-cyan-400 font-bold text-lg">{report.unaffectedAssignmentsPreservedCount}</span>
                  </div>
                </div>

                {/* Reassigned List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400">Reassigned Bookings Trace</h4>
                  {report.reassignedBookings.length > 0 ? (
                    report.reassignedBookings.map((re) => (
                      <div key={re.bookingId} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="font-bold text-white">Booking #{re.bookingId}</span>
                          <span className="text-emerald-400">Reassigned</span>
                        </div>
                        <p className="text-slate-400">{re.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No bookings required reassignment.</p>
                  )}
                </div>

                {/* Unresolved List */}
                {report.unresolvedBookingIds.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase text-rose-400">Unresolved Conflicts</h4>
                    {report.unresolvedBookingIds.map((un) => (
                      <div key={un.bookingId} className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono space-y-1">
                        <span className="font-bold text-rose-300">Booking #{un.bookingId}</span>
                        <p className="text-rose-400">{un.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <RefreshCw className="w-8 h-8 text-cyan-400 opacity-40 mx-auto" />
              <p className="text-sm font-mono text-slate-300">No active recovery report generated yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an affected room on the left and trigger emergency recovery to evaluate reassignment algorithms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
