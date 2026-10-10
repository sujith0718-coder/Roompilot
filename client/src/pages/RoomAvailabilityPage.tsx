import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Room, Facility } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Building2,
  Plus,
  Lock,
  Unlock,
  Search,
  Users,
  X,
  LayoutGrid,
  List,
  MapPin,
} from 'lucide-react';

export const RoomAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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

  // Table Columns Definition
  const tableColumns: Column<Room>[] = [
    {
      header: 'Room Code & Name',
      accessorKey: 'code',
      cell: (room) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-cyan-400">{room.code}</span>
            <StatusBadge roomStatus={room.isBlocked ? 'BLOCKED' : 'AVAILABLE'} size="sm" />
          </div>
          <span className="text-xs text-slate-300 font-sans block">{room.name}</span>
        </div>
      ),
    },
    {
      header: 'Location',
      accessorKey: 'building',
      cell: (room) => (
        <div className="text-xs font-mono text-slate-400">
          <span>{room.building}</span> &bull; <span>Floor {room.floor}</span>
        </div>
      ),
    },
    {
      header: 'Capacity',
      accessorKey: 'capacity',
      cell: (room) => (
        <span className="font-mono font-bold text-xs text-slate-200">{room.capacity} seats</span>
      ),
    },
    {
      header: 'Facilities',
      cell: (room) => (
        <div className="flex flex-wrap gap-1">
          {room.facilities.map((fac) => (
            <span
              key={fac}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
            >
              {fac.replace('_', ' ')}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (room) =>
        canBlockRooms ? (
          <button
            onClick={() => {
              setSelectedRoom(room);
              setIsBlockModalOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
              room.isBlocked
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {room.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{room.isBlocked ? 'Unblock' : 'Block Room'}</span>
          </button>
        ) : (
          <span className="text-[11px] font-mono text-slate-500">View Only</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={['Scheduling', 'Room Directory']}
        title="Room Availability Directory"
        description="Filterable inventory of campus lecture halls, laboratories, seminar rooms, and exam complexes with real-time blockage controls."
        badge={`${filteredRooms.length} Rooms`}
        action={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {canManageRooms && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Room</span>
              </button>
            )}
          </div>
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name, building..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-sans"
            />
          </div>

          {/* Building Filter */}
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-sans"
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
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-sans"
          >
            <option value="ALL">All Facilities</option>
            {allFacilities.map((f) => (
              <option key={f} value={f}>
                {f.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Min Capacity Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
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
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 cursor-pointer select-none">
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

      {/* Main Content: Grid or Table */}
      {isLoading ? (
        <LoadingSpinner label="Loading Campus Rooms..." />
      ) : viewMode === 'table' ? (
        <DataTable columns={tableColumns} data={filteredRooms} searchPlaceholder="Search table..." />
      ) : filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-2xl border p-5 space-y-4 transition-all duration-200 relative overflow-hidden ${
                room.isBlocked
                  ? 'bg-slate-900/60 border-rose-500/30'
                  : 'bg-slate-900/80 backdrop-blur-md border-slate-800/80 hover:border-slate-700/80 shadow-xl shadow-slate-950/40 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-cyan-400">{room.code}</span>
                    <StatusBadge roomStatus={room.isBlocked ? 'BLOCKED' : 'AVAILABLE'} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-white font-sans">{room.name}</h4>
                </div>

                {canBlockRooms && (
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setIsBlockModalOpen(true);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      room.isBlocked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10'
                    }`}
                    title={room.isBlocked ? 'Unblock Room' : 'Block Room for Maintenance'}
                  >
                    {room.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Location & Capacity */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{room.building}</span>
                </div>
                <div className="flex items-center gap-1.5 text-right justify-end">
                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-slate-200 font-bold">{room.capacity} seats</span>
                </div>
              </div>

              {/* Facilities Badge Cloud */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Facilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {room.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950/80 text-cyan-300 border border-slate-800"
                    >
                      {fac.replace('_', ' ')}
                    </span>
                  ))}
                  {room.facilities.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic">Standard Seating Only</span>
                  )}
                </div>
              </div>

              {/* Block Reason Alert if blocked */}
              {room.isBlocked && room.blockReason && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono space-y-0.5">
                  <span className="font-bold text-[10px] block uppercase text-rose-400">Blockage Reason:</span>
                  <p className="text-[11px] line-clamp-2">{room.blockReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No rooms match your filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBuilding('ALL');
              setSelectedFacility('ALL');
              setMinCapacity(0);
              setShowBlockedOnly(false);
            }}
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Add New Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Building2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-sans">Add Campus Room</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Room Code (e.g. CS-105)</label>
                <input
                  type="text"
                  required
                  value={newRoom.code}
                  onChange={(e) => setNewRoom({ ...newRoom, code: e.target.value.toUpperCase() })}
                  placeholder="CS-105"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Room Name</label>
                <input
                  type="text"
                  required
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="Advanced Computing Lab"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono">Floor</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Building</label>
                <input
                  type="text"
                  required
                  value={newRoom.building}
                  onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                  placeholder="Computer Science Block"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Facilities</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {allFacilities.map((fac) => (
                    <label key={fac} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                      <input
                        type="checkbox"
                        checked={newRoom.facilities.includes(fac)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...newRoom.facilities, fac]
                            : newRoom.facilities.filter((f) => f !== fac);
                          setNewRoom({ ...newRoom, facilities: updated });
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
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block / Unblock Modal */}
      {isBlockModalOpen && selectedRoom && (
        <ConfirmationModal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          onConfirm={handleToggleBlock}
          title={selectedRoom.isBlocked ? `Unblock Room ${selectedRoom.code}` : `Block Room ${selectedRoom.code}`}
          message={
            selectedRoom.isBlocked
              ? `Are you sure you want to remove the blockage on ${selectedRoom.name}? It will become available for new allocation runs.`
              : `Blocking ${selectedRoom.name} will mark it as unavailable. Enter a valid maintenance reason.`
          }
          confirmText={selectedRoom.isBlocked ? 'Confirm Unblock' : 'Confirm Block'}
          confirmVariant={selectedRoom.isBlocked ? 'primary' : 'danger'}
          isLoading={isSubmitting}
        >
          {!selectedRoom.isBlocked && (
            <div className="space-y-1.5 mt-3 text-left">
              <label className="text-xs font-mono text-slate-400">Blockage Reason</label>
              <input
                type="text"
                required
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. HVAC Repair, Exam Cell Reservation"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 font-sans"
              />
            </div>
          )}
        </ConfirmationModal>
      )}
    </div>
  );
};
