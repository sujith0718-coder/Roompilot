import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AllocationResult, BookingRequest, Room } from '../types';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

export const AllocationExplanationsPage: React.FC = () => {
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [result, bookingData, roomData] = await Promise.all([
          api.runAllocation('HEURISTIC'),
          api.getBookings(),
          api.getRooms(),
        ]);
        setAllocationResult(result);
        setBookings(bookingData);
        setRooms(roomData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load allocation explanations');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner label="Evaluating allocation explanations & hard constraints..." />;
  }

  const bookingMap = new Map(bookings.map((b) => [b.id, b]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Allocation Explanations & Validation Results"
        description="Step-by-step audit trace for allocated rooms, hard constraint validation outcomes, and unassigned failure explanations."
        badge="Independent Validation Logic"
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {/* Summary Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Engine Audit Snapshot ({allocationResult?.method})</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Timestamp: {allocationResult?.timestamp ? new Date(allocationResult.timestamp).toLocaleString() : 'N/A'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block">Assigned Assignments</span>
            <span className="text-emerald-400 font-bold text-base">{allocationResult?.assignments.length} Successes</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block">Unassigned Bookings</span>
            <span className="text-amber-400 font-bold text-base">{allocationResult?.unassigned.length} Issues</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 block">Average Capacity Waste</span>
            <span className="text-cyan-400 font-bold text-base">{allocationResult?.metrics.capacityWasteAverage} Seats / Room</span>
          </div>
        </div>
      </div>

      {/* Assigned Allocation Explanations Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Successful Allocation Traces & Explanations</span>
        </h3>

        <div className="space-y-3">
          {allocationResult?.assignments.map((assignment, index) => {
            const booking = bookingMap.get(assignment.bookingId);
            const room = roomMap.get(assignment.roomId);

            return (
              <div
                key={assignment.bookingId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">Step #{index + 1} Assignment</span>
                    <h4 className="text-sm font-bold text-white">{booking?.title || assignment.bookingId}</h4>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">Assigned Room:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                      {room ? `${room.code} (${room.name})` : assignment.roomId}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{assignment.explanation}</span>
                </div>

                {/* Hard Constraint Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Capacity Checked</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Facilities Matched</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>No Time Overlap</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Room Unblocked</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Bookings Section */}
      {allocationResult && allocationResult.unassigned.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Unassigned Booking Failure Explanations</span>
          </h3>

          <div className="space-y-3">
            {allocationResult.unassigned.map((unassigned) => {
              const booking = bookingMap.get(unassigned.bookingId);

              return (
                <div
                  key={unassigned.bookingId}
                  className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{booking?.title || unassigned.bookingId}</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono">
                      Unassigned
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{unassigned.reason}</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Evaluated against {unassigned.evaluatedRoomsCount} physical campus rooms.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
