import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AllocationResult, BookingRequest, Room, HardConstraintValidationResult } from '../types';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const AllocationExplanationsPage: React.FC = () => {
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [validationResult, setValidationResult] = useState<HardConstraintValidationResult | null>(null);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        setValidationResult(result.validation || { isValid: true, violations: [] });
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

  const filteredAssignments = (allocationResult?.assignments || []).filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const b = bookingMap.get(a.bookingId);
    const r = roomMap.get(a.roomId);
    return (
      a.explanation.toLowerCase().includes(q) ||
      (b && b.title.toLowerCase().includes(q)) ||
      (r && r.code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={['Operations', 'Validation & Traces']}
        title="Allocation Explanations & Validation Traces"
        description="Step-by-step audit trace for assigned rooms, hard constraint validation results, and unassigned failure rationale."
        badge="Independent Validation Engine"
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {/* Summary Conformance Banner */}
      <div className="rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Engine Conformance Audit ({allocationResult?.method})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Evaluated against 5 Hard Constraints (Capacity, Facilities, Closures, Overlaps, Uniqueness)
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold border ${
              validationResult?.isValid !== false
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {validationResult?.isValid !== false ? 'CONFORMANCE: PASS' : 'CONFORMANCE: FAIL'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Assigned Traces</span>
            <span className="text-emerald-400 font-black text-lg">
              {allocationResult?.assignments.length} Successes
            </span>
          </div>
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Unassigned Issues</span>
            <span className="text-amber-400 font-black text-lg">
              {allocationResult?.unassigned.length} Exceptions
            </span>
          </div>
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px] font-bold block">Capacity Waste Avg</span>
            <span className="text-cyan-400 font-black text-lg">
              {allocationResult?.metrics.capacityWasteAverage} Seats / Room
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trace by keyword, title, room..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Assigned Allocation Explanations Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Successful Allocation Traces & Rationale ({filteredAssignments.length})</span>
        </h3>

        <div className="space-y-3">
          {filteredAssignments.map((assignment, index) => {
            const booking = bookingMap.get(assignment.bookingId);
            const room = roomMap.get(assignment.roomId);

            return (
              <div
                key={index}
                className="p-5 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-cyan-400 font-bold">Booking #{assignment.bookingId}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-emerald-400 font-bold">Room #{assignment.roomId}</span>
                  </div>
                  {booking && (
                    <span className="text-xs font-bold text-white font-sans">{booking.title}</span>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-mono leading-relaxed">{assignment.explanation}</p>

                {room && (
                  <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center gap-3">
                    <span>
                      Room Code: <strong className="text-slate-200">{room.code}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Capacity: <strong className="text-slate-200">{room.capacity}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Exceptions Section */}
      {allocationResult?.unassigned && allocationResult.unassigned.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
            <XCircle className="w-5 h-5 text-amber-400" />
            <span>Unassigned Occurrence Explanations ({allocationResult.unassigned.length})</span>
          </h3>

          <div className="space-y-3">
            {allocationResult.unassigned.map((un, idx) => (
              <div
                key={idx}
                className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span>Unassigned Booking #{un.bookingId}</span>
                  <span>Evaluated Rooms: {un.evaluatedRoomsCount}</span>
                </div>
                <p className="text-amber-200/90 text-xs leading-relaxed">{un.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
