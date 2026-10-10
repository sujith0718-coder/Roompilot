import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BookingRequest, Facility, BookingStatus } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  PlusCircle,
  X,
  Filter,
  Check,
} from 'lucide-react';

const FACILITIES: Facility[] = [
  'PROJECTOR',
  'LAB_EQUIPMENT',
  'AUDIO_SYSTEM',
  'AC',
  'SMART_BOARD',
  'WHEELCHAIR_ACCESSIBLE',
];

export const BookingRequestPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'TUTOR';

  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modals for Approve/Reject
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [enrollmentCount, setEnrollmentCount] = useState<number>(45);
  const [dayOfWeek, setDayOfWeek] = useState<'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'>('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [selectedFacilities, setSelectedFacilities] = useState<Facility[]>(['PROJECTOR', 'AC']);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load booking requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const validateForm = (): boolean => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Event title / purpose is required');
    if (enrollmentCount <= 0) errs.push('Expected attendance must be greater than 0');
    if (startTime >= endTime) errs.push('Start time must be earlier than end time');
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.createBooking({
        title,
        requesterId: user?.id || 'usr_demo',
        requesterRole: role,
        department: user?.department || 'Department',
        enrollmentCount,
        requiredFacilities: selectedFacilities,
        slot: {
          dayOfWeek,
          startTime,
          endTime,
          date: new Date().toISOString().split('T')[0],
        },
      });

      setSuccessMsg(`Booking request "${title}" successfully submitted.`);
      setTitle('');
      setEnrollmentCount(45);
      setIsCreateModalOpen(false);
      await loadBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: BookingStatus) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await api.updateBookingStatus(selectedBooking.id, status);
      setSuccessMsg(`Booking #${selectedBooking.id} status updated to ${status}.`);
      setSelectedBooking(null);
      setActionType(null);
      await loadBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canApprove = ['SECRETARY', 'HOD', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const columns: Column<BookingRequest>[] = [
    {
      header: 'Title & Department',
      accessorKey: 'title',
      cell: (b) => (
        <div className="space-y-0.5">
          <span className="font-bold text-white text-xs block">{b.title}</span>
          <span className="text-[11px] font-mono text-slate-400 block">
            {b.requesterRole} &bull; {b.department || 'Academic'}
          </span>
        </div>
      ),
    },
    {
      header: 'Time Slot',
      cell: (b) => (
        <span className="font-mono text-xs text-cyan-400 font-bold">
          {b.slot.dayOfWeek.slice(0, 3)} ({b.slot.startTime}-{b.slot.endTime})
        </span>
      ),
    },
    {
      header: 'Attendees',
      accessorKey: 'enrollmentCount',
      cell: (b) => <span className="font-mono text-xs text-slate-200">{b.enrollmentCount} seats</span>,
    },
    {
      header: 'Required Facilities',
      cell: (b) => (
        <div className="flex flex-wrap gap-1">
          {b.requiredFacilities.map((f) => (
            <span key={f} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {f.replace('_', ' ')}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (b) => <StatusBadge status={b.status} size="sm" />,
    },
    {
      header: 'Actions',
      cell: (b) =>
        canApprove && b.status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedBooking(b);
                setActionType('APPROVE');
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => {
                setSelectedBooking(b);
                setActionType('REJECT');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-mono flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-slate-500">
            {b.assignedRoomId ? `Room: ${b.assignedRoomId}` : 'No Action'}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={['Scheduling', 'Room Requests']}
        title="Classroom Booking Requests"
        description="Submit classroom slot allocation requests for lectures, tutorials, club events, and exams. Review and approve pending submissions."
        badge={`${filteredBookings.length} Requests`}
        action={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Request</span>
          </button>
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}
      {successMsg && <AlertBanner type="success" title="Success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-xs">
          <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-400">Filter Status:</span>
          {['ALL', 'PENDING', 'APPROVED', 'ALLOCATED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Fetching Booking Requests Queue..." />
      ) : (
        <DataTable columns={columns} data={filteredBookings} searchPlaceholder="Search requests..." />
      )}

      {/* Submit Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <PlusCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-sans">Submit Booking Request</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono space-y-1">
                {validationErrors.map((err, idx) => (
                  <p key={idx}>&bull; {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-xs">Event Title / Purpose</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CS301 Data Structures Midterm Test"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-xs">Day of Week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-xs">Expected Attendance</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={enrollmentCount}
                    onChange={(e) => setEnrollmentCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-xs">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono text-xs">End Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-mono text-xs">Required Facilities</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {FACILITIES.map((fac) => (
                    <label key={fac} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                      <input
                        type="checkbox"
                        checked={selectedFacilities.includes(fac)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...selectedFacilities, fac]
                            : selectedFacilities.filter((f) => f !== fac);
                          setSelectedFacilities(updated);
                        }}
                        className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                      />
                      <span>{fac.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approval/Rejection */}
      {selectedBooking && actionType && (
        <ConfirmationModal
          isOpen={!!selectedBooking}
          onClose={() => {
            setSelectedBooking(null);
            setActionType(null);
          }}
          onConfirm={() => handleUpdateStatus(actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED')}
          title={`${actionType === 'APPROVE' ? 'Approve' : 'Reject'} Request #${selectedBooking.id}`}
          message={`Are you sure you want to ${actionType.toLowerCase()} "${selectedBooking.title}"?`}
          confirmText={actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
          confirmVariant={actionType === 'APPROVE' ? 'primary' : 'danger'}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};
