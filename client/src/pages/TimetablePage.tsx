import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BookingRequest, Room } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  Clock,
  Grid,
  List,
  Filter,
} from 'lucide-react';

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
        const [bookingData, roomData] = await Promise.all([
          api.getBookings(),
          api.getRooms(),
        ]);
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
    <div className="space-y-6">
      <PageHeader
        title="Timetable & Room Allocations"
        description="Schedule view of allocated physical rooms, time slots, expected attendance, facilities, and approval status."
        badge={`${filteredBookings.length} Allocated Slot(s)`}
        action={
          <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
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
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Days Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                selectedDay === day
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
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
        <LoadingSpinner label="Loading Timetable & Allocations..." />
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date & Time Slot</th>
                  <th className="px-5 py-3.5">Class / Event Title</th>
                  <th className="px-5 py-3.5">Assigned Room</th>
                  <th className="px-5 py-3.5">Attendance</th>
                  <th className="px-5 py-3.5">Requester Role</th>
                  <th className="px-5 py-3.5">Facilities Required</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((b) => {
                    const assignedRoom = b.assignedRoomId ? roomMap.get(b.assignedRoomId) : null;
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{b.slot.startTime} - {b.slot.endTime}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">{b.slot.date || selectedDay}</span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-white">
                          <div>{b.title}</div>
                          <span className="text-[10px] font-mono text-slate-400">{b.department || 'General'}</span>
                        </td>
                        <td className="px-5 py-4 font-mono">
                          {assignedRoom ? (
                            <div>
                              <span className="text-cyan-400 font-bold">{assignedRoom.code}</span>
                              <span className="text-[10px] text-slate-400 block">{assignedRoom.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300">
                          {b.enrollmentCount} seats
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge role={b.requesterRole} />
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
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500 font-mono">
                      No allocations or room requests scheduled for {selectedDay}.
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
          {filteredBookings.length > 0 ? (
            filteredBookings.map((b) => {
              const assignedRoom = b.assignedRoomId ? roomMap.get(b.assignedRoomId) : null;
              return (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={b.status} />
                    <span className="text-xs font-mono text-slate-400">{b.slot.startTime} - {b.slot.endTime}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{b.title}</h4>
                    <p className="text-xs text-slate-400">{b.department || 'Campus'}</p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Room Assigned:</span>
                      <span className="text-cyan-400 font-bold">{assignedRoom ? assignedRoom.code : 'Pending'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Attendance:</span>
                      <span className="text-slate-200">{b.enrollmentCount} attendees</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {b.requiredFacilities.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl font-mono">
              No allocations scheduled on {selectedDay}.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
