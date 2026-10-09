import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BookingRequest, Facility } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
      await loadBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await api.updateBookingStatus(id, newStatus);
      await loadBookings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update booking status');
    }
  };

  const canApprove = ['SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'].includes(role);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Classroom & Hall Request Portal"
        description="Submit formal room requests for lectures, tutorials, club events, exams, or department gatherings."
        badge={`Authorized Role: ${role}`}
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}
      {successMsg && <AlertBanner type="success" title="Request Submitted" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 h-fit">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">New Room Request</h3>
              <p className="text-xs text-slate-400">Pre-validated against hard constraints</p>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Event Purpose / Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS201 Algorithm Tutorial"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Expected Attendance</label>
              <input
                type="number"
                required
                min={1}
                value={enrollmentCount}
                onChange={(e) => setEnrollmentCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                  <option value="FRIDAY">Friday</option>
                  <option value="SATURDAY">Saturday</option>
                  <option value="SUNDAY">Sunday</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">Time Slot</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                  />
                  <span className="text-slate-500 text-xs">-</span>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="11:00"
                    className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 block">Required Facilities</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FACILITIES.map((fac) => {
                  const isChecked = selectedFacilities.includes(fac);
                  return (
                    <button
                      type="button"
                      key={fac}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedFacilities(selectedFacilities.filter((f) => f !== fac));
                        } else {
                          setSelectedFacilities([...selectedFacilities, fac]);
                        }
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-mono text-left transition-colors truncate ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {fac.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Existing Requests Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Active Booking Requests & Approvals</h3>
            <span className="text-xs font-mono text-slate-400">{bookings.length} Total Requests</span>
          </div>

          {isLoading ? (
            <LoadingSpinner label="Fetching active requests..." />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Title & Dept</th>
                      <th className="px-5 py-3.5">Requester Role</th>
                      <th className="px-5 py-3.5">Slot & Count</th>
                      <th className="px-5 py-3.5">Facilities</th>
                      <th className="px-5 py-3.5">Status</th>
                      {canApprove && <th className="px-5 py-3.5">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{b.title}</div>
                          <span className="text-[10px] font-mono text-slate-400">{b.department || 'Campus'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge role={b.requesterRole} />
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          <div>{b.slot.dayOfWeek} ({b.slot.startTime}-{b.slot.endTime})</div>
                          <span className="text-[10px] text-slate-500">{b.enrollmentCount} seats</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {b.requiredFacilities.map((f) => (
                              <span key={f} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={b.status} />
                        </td>
                        {canApprove && (
                          <td className="px-5 py-4">
                            {b.status === 'PENDING' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'APPROVED')}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                  title="Approve Request"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(b.id, 'REJECTED')}
                                  className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                  title="Reject Request"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">Processed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
