import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Room, RecoveryReport, BookingRequest } from '../types';
import { PageHeader } from '../components/PageHeader';
import { AlertBanner } from '../components/AlertBanner';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  AlertOctagon,
  ShieldAlert,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const DisruptionRecoveryPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reason, setReason] = useState<string>('Emergency HVAC duct repair and water leak');
  const [report, setReport] = useState<RecoveryReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [roomData, bookingData] = await Promise.all([
        api.getRooms(),
        api.getBookings().catch(() => []),
      ]);
      setRooms(roomData);
      setBookings(bookingData);
      if (roomData.length > 0 && !selectedRoomId) {
        setSelectedRoomId(roomData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoomId || r.code === selectedRoomId);
  const affectedBookingsCount = bookings.filter(
    (b) =>
      b.assignedRoomId === selectedRoomId ||
      b.assignedRoomId === selectedRoomObj?.id ||
      b.assignedRoomId === selectedRoomObj?.code
  ).length;

  const handleExecuteRecovery = async () => {
    if (!selectedRoomId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const recoveryReport = await api.closeRoomAndRecover(selectedRoomId, reason);
      setReport(recoveryReport);
      setIsConfirmOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recovery algorithm failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthorized = ['HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={['Operations', 'M5 Recovery Engine']}
        title="Room Closure & Disruption Recovery"
        description="Emergency disruption handling engine. Closes broken campus facilities and re-allocates affected bookings atomically while preserving non-disrupted assignments."
        badge="M5 Engine Active"
      />

      {error && <AlertBanner type="error" title="Recovery Engine Exception" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trigger Form Card */}
        <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6 h-fit">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">Trigger Disruption</h3>
              <p className="text-xs text-slate-400 font-mono">Select room & execute M5 engine</p>
            </div>
          </div>

          {!isAuthorized && (
            <AlertBanner
              type="warning"
              title="Restricted Access"
              message={`Role ${role} does not have authorization to trigger room closures. Access restricted to HOD, PRINCIPAL, and SYSTEM_ADMIN.`}
            />
          )}

          <div className="space-y-4 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-semibold">Select Disrupted Room</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={!isAuthorized || isLoading}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500/50 transition-colors"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} &bull; {r.name} ({r.capacity} seats, {r.isBlocked ? 'Blocked' : 'Active'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 font-semibold">Disruption Reason</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isAuthorized}
                placeholder="e.g. Electrical failure, Water leak"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 font-sans"
              />
            </div>

            {/* Impact Preview Card */}
            {selectedRoomObj && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target Room:</span>
                  <span className="font-bold text-cyan-400">{selectedRoomObj.code}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Capacity:</span>
                  <span className="text-slate-200">{selectedRoomObj.capacity} seats</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Assigned Bookings:</span>
                  <span className="font-bold text-amber-400">{affectedBookingsCount} Affected</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={!isAuthorized || isSubmitting || !selectedRoomId}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Review & Execute Recovery</span>
            </button>
          </div>
        </div>

        {/* Recovery Report Summary Area */}
        <div className="lg:col-span-2 space-y-6">
          {report ? (
            <div className="p-6 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">M5 Disruption Recovery Report</h3>
                    <p className="text-xs text-slate-400 font-mono">Closed Room ID: {report.closedRoomId}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold shadow-sm shadow-emerald-950/20">
                  RECOVERY COMPLETED
                </span>
              </div>

              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Affected Bookings</span>
                  <span className="text-amber-400 font-black text-2xl">{report.affectedBookingIds.length}</span>
                </div>
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Reassigned</span>
                  <span className="text-emerald-400 font-black text-2xl">{report.reassignedBookings.length}</span>
                </div>
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Preserved Unaffected</span>
                  <span className="text-cyan-400 font-black text-2xl">{report.unaffectedAssignmentsPreservedCount}</span>
                </div>
              </div>

              {/* Reassigned List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Reassigned Bookings Trace</span>
                </h4>
                {report.reassignedBookings.length > 0 ? (
                  report.reassignedBookings.map((re) => (
                    <div
                      key={re.bookingId}
                      className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-slate-200">
                        <span className="font-bold text-white">Booking #{re.bookingId}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          REASSIGNED
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{re.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                    No active bookings were assigned to this room during the closure window.
                  </p>
                )}
              </div>

              {/* Unresolved List */}
              {report.unresolvedBookingIds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase font-bold text-rose-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Unresolved Conflicts ({report.unresolvedBookingIds.length})</span>
                  </h4>
                  {report.unresolvedBookingIds.map((un) => (
                    <div
                      key={un.bookingId}
                      className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs font-mono space-y-1.5"
                    >
                      <span className="font-bold text-rose-300 block">Booking #{un.bookingId}</span>
                      <p className="text-rose-400 text-[11px] leading-relaxed">{un.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
              <RefreshCw className="w-10 h-10 text-cyan-400 opacity-40 mx-auto animate-spin-slow" />
              <p className="text-sm font-semibold text-slate-300 font-sans">No recovery report generated yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">
                Select an affected room on the left, enter a disruption reason, and execute recovery to initiate atomic re-allocation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && selectedRoomObj && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleExecuteRecovery}
          title={`Execute Emergency Recovery for ${selectedRoomObj.code}`}
          message={`This operation will close ${selectedRoomObj.name} (${selectedRoomObj.code}), update room closure records in MongoDB, and attempt to reassign ${affectedBookingsCount} affected booking(s).`}
          confirmText="Confirm Emergency Recovery"
          confirmVariant="danger"
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};
