import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Room, Facility } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Building2,
  Plus,
  Lock,
  Unlock,
  Search,
  Users,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';

export const RoomAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  // Modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Room Form State
  const [newRoom, setNewRoom] = useState<{
    code: string;
    name: string;
    capacity: number;
    building: string;
    floor: number;
    facilities: Facility[];
  }>({
    code: '',
    name: '',
    capacity: 50,
    building: 'CS Block',
    floor: 1,
    facilities: ['PROJECTOR', 'AC'],
  });

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRooms();
      setRooms(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Filter Logic
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuilding = selectedBuilding === 'ALL' || r.building === selectedBuilding;
    const matchesFacility =
      selectedFacility === 'ALL' || r.facilities.includes(selectedFacility as Facility);
    const matchesCapacity = r.capacity >= minCapacity;
    const matchesBlocked = !showBlockedOnly || r.isBlocked;

    return matchesSearch && matchesBuilding && matchesFacility && matchesCapacity && matchesBlocked;
  });

  const buildings = Array.from(new Set(rooms.map((r) => r.building)));
  const allFacilities: Facility[] = [
    'PROJECTOR',
    'LAB_EQUIPMENT',
    'AUDIO_SYSTEM',
    'AC',
    'SMART_BOARD',
    'WHEELCHAIR_ACCESSIBLE',
  ];

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createRoom(newRoom);
      setIsCreateModalOpen(false);
      setNewRoom({
        code: '',
        name: '',
        capacity: 50,
        building: 'CS Block',
        floor: 1,
        facilities: ['PROJECTOR', 'AC'],
      });
      await loadRooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Room creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedRoom) return;
    setIsSubmitting(true);
    try {
      await api.toggleBlockRoom(selectedRoom.id, !selectedRoom.isBlocked, blockReason);
      setIsBlockModalOpen(false);
      setSelectedRoom(null);
      setBlockReason('');
      await loadRooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update block status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManageRooms = role === 'SYSTEM_ADMIN';
  const canBlockRooms = ['SYSTEM_ADMIN', 'HOD', 'PRINCIPAL'].includes(role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Availability Directory"
        description="Filterable inventory of campus lecture halls, laboratories, seminar rooms and exam complexes."
        badge={`${filteredRooms.length} Rooms Available`}
        action={
          canManageRooms ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Room</span>
            </button>
          ) : undefined
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Building Filter */}
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Buildings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Facility Filter */}
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Facilities</option>
            {allFacilities.map((f) => (
              <option key={f} value={f}>
                {f.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Min Capacity Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400 font-mono">Min Cap:</span>
            <input
              type="number"
              min={0}
              step={10}
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-16 bg-transparent text-xs font-mono text-cyan-400 focus:outline-none"
            />
          </div>

          {/* Blocked Only Checkbox */}
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBlockedOnly}
              onChange={(e) => setShowBlockedOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Blocked Only</span>
          </label>
        </div>
      </div>

      {/* Grid of Rooms */}
      {isLoading ? (
        <LoadingSpinner label="Loading Campus Rooms..." />
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-2xl border p-5 space-y-4 transition-all duration-200 ${
                room.isBlocked
                  ? 'bg-slate-900/60 border-rose-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">{room.code}</h3>
                    <StatusBadge status={room.isBlocked ? 'BLOCKED' : 'AVAILABLE'} />
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{room.name}</p>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Capacity</span>
                  <span className="font-bold text-cyan-400 text-sm">{room.capacity} seats</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Location</span>
                  <span className="truncate block">{room.building} (Fl {room.floor})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Facilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {room.facilities.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                    >
                      {f.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {room.isBlocked && room.blockReason && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="truncate">Reason: {room.blockReason}</span>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
                <button
                  onClick={() => setSelectedRoom(room)}
                  className="text-cyan-400 hover:underline font-mono text-xs"
                >
                  Details &rarr;
                </button>

                {canBlockRooms && (
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setBlockReason(room.blockReason || '');
                      setIsBlockModalOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-colors flex items-center gap-1.5 ${
                      room.isBlocked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    {room.isBlocked ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Unblock</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Block</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-sm font-mono">No rooms matched your criteria.</p>
        </div>
      )}

      {/* Room Detail Modal */}
      {selectedRoom && !isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">{selectedRoom.code}</h3>
                  <p className="text-xs text-slate-400">{selectedRoom.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Building Block</span>
                <span className="text-slate-200 font-semibold">{selectedRoom.building}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Floor Number</span>
                <span className="text-slate-200 font-semibold">Floor {selectedRoom.floor}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Max Seating</span>
                <span className="text-cyan-400 font-semibold">{selectedRoom.capacity} seats</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={selectedRoom.isBlocked ? 'BLOCKED' : 'AVAILABLE'} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Configured Facilities</span>
              <div className="flex flex-wrap gap-2">
                {selectedRoom.facilities.map((f) => (
                  <span key={f} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span>{f.replace('_', ' ')}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-mono hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block / Unblock Modal */}
      <ConfirmationModal
        isOpen={isBlockModalOpen}
        title={selectedRoom?.isBlocked ? `Unblock Room ${selectedRoom.code}` : `Block Room ${selectedRoom?.code}`}
        message={
          selectedRoom?.isBlocked
            ? `Are you sure you want to reactivate ${selectedRoom.code}? It will become available for automated allocations.`
            : `Blocking ${selectedRoom?.code} will prevent new allocations and trigger emergency disruption recovery if active bookings exist.`
        }
        confirmLabel={selectedRoom?.isBlocked ? 'Unblock Room' : 'Confirm Block'}
        variant={selectedRoom?.isBlocked ? 'info' : 'danger'}
        isLoading={isSubmitting}
        onConfirm={handleToggleBlock}
        onCancel={() => {
          setIsBlockModalOpen(false);
          setSelectedRoom(null);
        }}
      >
        {!selectedRoom?.isBlocked && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-mono text-slate-400">Block Reason / Maintenance Note</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. AC Compressor Repair, Emergency Plumbing"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </ConfirmationModal>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create New Room Record</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Room Code</label>
                  <input
                    type="text"
                    required
                    value={newRoom.code}
                    onChange={(e) => setNewRoom({ ...newRoom, code: e.target.value })}
                    placeholder="e.g. CS-105"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Capacity</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g. Quantum Computing Research Lab"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Building Block</label>
                  <input
                    type="text"
                    required
                    value={newRoom.building}
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">Floor</label>
                  <input
                    type="number"
                    required
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 block">Facilities</label>
                <div className="grid grid-cols-2 gap-2">
                  {allFacilities.map((fac) => {
                    const isChecked = newRoom.facilities.includes(fac);
                    return (
                      <label
                        key={fac}
                        className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoom({ ...newRoom, facilities: [...newRoom.facilities, fac] });
                            } else {
                              setNewRoom({ ...newRoom, facilities: newRoom.facilities.filter((f) => f !== fac) });
                            }
                          }}
                          className="hidden"
                        />
                        <span>{fac.replace('_', ' ')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-mono font-bold text-white"
                >
                  {isSubmitting ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
