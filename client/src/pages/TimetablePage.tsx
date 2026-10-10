import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BookingRequest, Room } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import { Clock, Grid, List, Filter } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export const TimetablePage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [bookingData, roomData] = await Promise.all([api.getBookings(), api.getRooms()]);
        setBookings(bookingData);
        setRooms(roomData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load timetable data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const filteredBookings = bookings.filter((b) => {
    const matchesDay = b.slot.dayOfWeek === selectedDay;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesDay && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={['Scheduling', 'Timetable & Allocations']}
        title="Timetable & Room Allocations"
        description="Schedule view of assigned physical rooms, time slots, attendance, facilities, and approval status."
        badge={`${filteredBookings.length} Allocated Slots on ${selectedDay}`}
        action={
          <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Slot Grid</span>
            </button>
          </div>
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {/* Day Selector & Status Filter Toolbar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Days Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                selectedDay === day
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-md shadow-cyan-950/20'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs font-mono w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALLOCATED">ALLOCATED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Fetching Timetable Schedule..." />
      ) : viewMode === 'table' ? (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Time Slot</th>
                  <th className="px-5 py-3.5">Event Title & Requester</th>
                  <th className="px-5 py-3.5">Assigned Room</th>
                  <th className="px-5 py-3.5">Attendance</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((b) => {
                    const room = b.assignedRoomId ? roomMap.get(b.assignedRoomId) : null;
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-cyan-400 font-bold whitespace-nowrap">
                          {b.slot.startTime} - {b.slot.endTime}
                        </td>
                        <td className="px-5 py-4 space-y-0.5">
                          <span className="font-bold text-white block">{b.title}</span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {b.requesterRole} &bull; {b.department || 'Academic'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs whitespace-nowrap">
                          {room ? (
                            <div>
                              <span className="font-bold text-white block">{room.code}</span>
                              <span className="text-[10px] text-slate-400 block">{room.name}</span>
                            </div>
                          ) : b.assignedRoomId ? (
                            <span className="text-slate-300">{b.assignedRoomId}</span>
                          ) : (
                            <span className="text-amber-400 italic">Unassigned Queue</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                          {b.enrollmentCount} students
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500 font-mono">
                      No schedule entries for {selectedDay} matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Slot Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const room = b.assignedRoomId ? roomMap.get(b.assignedRoomId) : null;
            return (
              <div
                key={b.id}
                className="p-5 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {b.slot.startTime} - {b.slot.endTime}
                    </span>
                  </div>
                  <StatusBadge status={b.status} size="sm" />
                </div>

                <h4 className="font-bold text-white text-sm font-sans">{b.title}</h4>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room:</span>
                    <span className="font-bold text-slate-200">{room ? `${room.code} (${room.name})` : b.assignedRoomId || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Enrollment:</span>
                    <span className="text-slate-300">{b.enrollmentCount} attendees</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
