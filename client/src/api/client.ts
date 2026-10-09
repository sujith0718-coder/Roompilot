import {
  User,
  UserRole,
  Room,
  BookingRequest,
  BookingStatus,
  AllocationMethod,
  AllocationResult,
  RecoveryReport,
  AuditLogEntry,
  HardConstraintValidationResult,
  ApiSuccess,
  ApiError,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiClientError extends Error {
  public code: string;
  public details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Track whether backend is active or using mock fallback
export let isUsingMockAdapter = false;

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('roomwise_auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorData = (data as ApiError).error || {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'API Request Failed',
      };
      throw new ApiClientError(errorData.code, errorData.message, errorData.details);
    }

    isUsingMockAdapter = false;
    return (data as ApiSuccess<T>).data;
  } catch (error: unknown) {
    if (error instanceof ApiClientError && error.code !== 'HTTP_404') {
      throw error;
    }
    // Set flag for UI transparency
    isUsingMockAdapter = true;
    throw error;
  }
}

// ==========================================
// MOCK DATA STORE (DEVELOPMENT ADAPTER)
// ==========================================

const INITIAL_ROOMS: Room[] = [
  { id: 'rm_101', code: 'CS-101', name: 'Alan Turing Lecture Hall', capacity: 120, facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC', 'WHEELCHAIR_ACCESSIBLE'], building: 'CS Block', floor: 1, isBlocked: false },
  { id: 'rm_102', code: 'CS-102', name: 'Ada Lovelace Computer Lab', capacity: 45, facilities: ['PROJECTOR', 'LAB_EQUIPMENT', 'AC', 'SMART_BOARD'], building: 'CS Block', floor: 1, isBlocked: false },
  { id: 'rm_201', code: 'EC-201', name: 'Electronics Seminar Room', capacity: 60, facilities: ['PROJECTOR', 'SMART_BOARD', 'AUDIO_SYSTEM'], building: 'EC Block', floor: 2, isBlocked: false },
  { id: 'rm_202', code: 'EC-202', name: 'Digital Signals Lab', capacity: 30, facilities: ['LAB_EQUIPMENT', 'PROJECTOR'], building: 'EC Block', floor: 2, isBlocked: false },
  { id: 'rm_301', code: 'MAIN-AUD', name: 'Grand Central Auditorium', capacity: 350, facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC', 'WHEELCHAIR_ACCESSIBLE'], building: 'Main Building', floor: 1, isBlocked: false },
  { id: 'rm_302', code: 'EXAM-HALL-A', name: 'Examination Complex Hall A', capacity: 200, facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC', 'WHEELCHAIR_ACCESSIBLE'], building: 'Exam Block', floor: 1, isBlocked: false },
  { id: 'rm_303', code: 'MECH-105', name: 'Thermodynamics Classroom', capacity: 75, facilities: ['PROJECTOR', 'AC'], building: 'Mechanical Block', floor: 1, isBlocked: true, blockReason: 'AC Compressor Repair' },
];

const INITIAL_BOOKINGS: BookingRequest[] = [
  {
    id: 'bk_001',
    title: 'CS301 Data Structures Midterm Test',
    requesterId: 'usr_tutor',
    requesterRole: 'TUTOR',
    department: 'Computer Science',
    enrollmentCount: 110,
    requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM'],
    slot: { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '11:00', date: '2026-10-12' },
    status: 'ALLOCATED',
    assignedRoomId: 'rm_101',
    createdAt: '2026-10-08T09:00:00.000Z',
  },
  {
    id: 'bk_002',
    title: 'Hackathon Orientation & Registration',
    requesterId: 'usr_event',
    requesterRole: 'EVENT_MANAGER',
    department: 'Student Affairs',
    enrollmentCount: 180,
    requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC'],
    slot: { dayOfWeek: 'MONDAY', startTime: '11:00', endTime: '13:00', date: '2026-10-12' },
    status: 'PENDING',
    createdAt: '2026-10-08T10:15:00.000Z',
  },
  {
    id: 'bk_003',
    title: 'Annual University Semester Examination - CS402',
    requesterId: 'usr_coe',
    requesterRole: 'COE',
    department: 'Examination Authority',
    enrollmentCount: 190,
    requiredFacilities: ['AUDIO_SYSTEM', 'AC', 'WHEELCHAIR_ACCESSIBLE'],
    slot: { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '13:00', date: '2026-10-13' },
    status: 'ALLOCATED',
    assignedRoomId: 'rm_302',
    createdAt: '2026-10-07T14:30:00.000Z',
  },
  {
    id: 'bk_004',
    title: 'Robotics Club Monthly Showcase',
    requesterId: 'usr_srep',
    requesterRole: 'STUDENT_REP',
    department: 'Information Technology',
    enrollmentCount: 40,
    requiredFacilities: ['PROJECTOR', 'LAB_EQUIPMENT'],
    slot: { dayOfWeek: 'WEDNESDAY', startTime: '14:00', endTime: '16:00', date: '2026-10-14' },
    status: 'APPROVED',
    createdAt: '2026-10-08T16:00:00.000Z',
  },
  {
    id: 'bk_005',
    title: 'Department Faculty Research Review',
    requesterId: 'usr_hod',
    requesterRole: 'HOD',
    department: 'Computer Science',
    enrollmentCount: 50,
    requiredFacilities: ['PROJECTOR', 'SMART_BOARD', 'AC'],
    slot: { dayOfWeek: 'THURSDAY', startTime: '15:00', endTime: '17:00', date: '2026-10-15' },
    status: 'ALLOCATED',
    assignedRoomId: 'rm_201',
    createdAt: '2026-10-09T08:00:00.000Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'log_001', userId: 'usr_admin', userRole: 'SYSTEM_ADMIN', action: 'CREATE_ROOM', resource: 'Room CS-101', details: { capacity: 120 }, timestamp: '2026-10-08T08:00:00.000Z' },
  { id: 'log_002', userId: 'usr_tutor', userRole: 'TUTOR', action: 'SUBMIT_BOOKING', resource: 'Booking bk_001', details: { title: 'CS301 Data Structures Midterm Test' }, timestamp: '2026-10-08T09:00:00.000Z' },
  { id: 'log_003', userId: 'usr_hod', userRole: 'HOD', action: 'RUN_ALLOCATION', resource: 'Allocation Engine', details: { method: 'HEURISTIC', assignedCount: 3 }, timestamp: '2026-10-08T11:00:00.000Z' },
  { id: 'log_004', userId: 'usr_sec', userRole: 'SECRETARY', action: 'APPROVE_BOOKING', resource: 'Booking bk_004', details: { status: 'APPROVED' }, timestamp: '2026-10-08T16:30:00.000Z' },
  { id: 'log_005', userId: 'usr_admin', userRole: 'SYSTEM_ADMIN', action: 'BLOCK_ROOM', resource: 'Room MECH-105', details: { reason: 'AC Compressor Repair' }, timestamp: '2026-10-09T08:00:00.000Z' },
];

let mockRooms = [...INITIAL_ROOMS];
let mockBookings = [...INITIAL_BOOKINGS];
let mockAuditLogs = [...INITIAL_AUDIT_LOGS];

// ==========================================
// API SERVICE METHODS WITH MOCK FALLBACKS
// ==========================================

export const api = {
  // 1. Health
  getHealth: async (): Promise<{ status: string; dbStatus: string; uptime: number }> => {
    try {
      return await request<{ status: string; dbStatus: string; uptime: number }>('/health');
    } catch {
      return { status: 'OK (Mock Adapter)', dbStatus: 'Connected (Development Mock)', uptime: 3600 };
    }
  },

  // 2. Auth
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    return request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<User> => {
    try {
      const res = await request<{ user: User } | User>('/auth/me');
      return (res && 'user' in res) ? (res as { user: User }).user : (res as User);
    } catch {
      const saved = localStorage.getItem('roomwise_user');
      if (saved) return JSON.parse(saved);
      return {
        id: 'usr_admin',
        name: 'System Admin',
        email: 'admin@campus.edu',
        role: 'SYSTEM_ADMIN',
        department: 'IT Services',
      };
    }
  },

  logout: async (): Promise<void> => {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Graceful offline fallback
    } finally {
      localStorage.removeItem('roomwise_auth_token');
      localStorage.removeItem('roomwise_user');
    }
  },


  // 3. Rooms
  getRooms: async (): Promise<Room[]> => {
    try {
      return await request<Room[]>('/rooms');
    } catch {
      return [...mockRooms];
    }
  },

  createRoom: async (room: Omit<Room, 'id' | 'isBlocked'>): Promise<Room> => {
    try {
      return await request<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify(room),
      });
    } catch {
      const newRoom: Room = {
        ...room,
        id: `rm_${Date.now()}`,
        isBlocked: false,
      };
      mockRooms.push(newRoom);
      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'usr_admin',
        userRole: 'SYSTEM_ADMIN',
        action: 'CREATE_ROOM',
        resource: `Room ${newRoom.code}`,
        details: { capacity: newRoom.capacity, building: newRoom.building },
        timestamp: new Date().toISOString(),
      });
      return newRoom;
    }
  },

  toggleBlockRoom: async (id: string, isBlocked: boolean, reason?: string): Promise<Room> => {
    try {
      return await request<Room>(`/rooms/${id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({ isBlocked, reason }),
      });
    } catch {
      const room = mockRooms.find((r) => r.id === id);
      if (!room) throw new ApiClientError('NOT_FOUND', 'Room not found');
      room.isBlocked = isBlocked;
      room.blockReason = reason;

      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'usr_admin',
        userRole: 'SYSTEM_ADMIN',
        action: isBlocked ? 'BLOCK_ROOM' : 'UNBLOCK_ROOM',
        resource: `Room ${room.code}`,
        details: { reason },
        timestamp: new Date().toISOString(),
      });
      return { ...room };
    }
  },

  // 4. Bookings
  getBookings: async (): Promise<BookingRequest[]> => {
    try {
      return await request<BookingRequest[]>('/bookings');
    } catch {
      return [...mockBookings];
    }
  },

  createBooking: async (bookingData: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>): Promise<BookingRequest> => {
    // Validate hard constraints locally for client check
    const violations: string[] = [];
    if (bookingData.enrollmentCount <= 0) violations.push('Enrollment count must be greater than 0');
    if (!bookingData.title.trim()) violations.push('Booking title is required');

    if (violations.length > 0) {
      throw new ApiClientError('VALIDATION_ERROR', violations.join('; '));
    }

    try {
      return await request<BookingRequest>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
    } catch {
      const newBooking: BookingRequest = {
        ...bookingData,
        id: `bk_${Date.now().toString().slice(-4)}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      mockBookings.unshift(newBooking);

      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: bookingData.requesterId,
        userRole: bookingData.requesterRole,
        action: 'SUBMIT_BOOKING',
        resource: `Booking ${newBooking.id}`,
        details: { title: newBooking.title, count: newBooking.enrollmentCount },
        timestamp: new Date().toISOString(),
      });
      return newBooking;
    }
  },

  updateBookingStatus: async (id: string, status: BookingStatus, assignedRoomId?: string): Promise<BookingRequest> => {
    try {
      return await request<BookingRequest>(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, assignedRoomId }),
      });
    } catch {
      const booking = mockBookings.find((b) => b.id === id);
      if (!booking) throw new ApiClientError('NOT_FOUND', 'Booking request not found');
      booking.status = status;
      if (assignedRoomId !== undefined) booking.assignedRoomId = assignedRoomId;

      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'usr_approver',
        userRole: 'HOD',
        action: `UPDATE_BOOKING_${status}`,
        resource: `Booking ${booking.id}`,
        details: { status, assignedRoomId },
        timestamp: new Date().toISOString(),
      });

      return { ...booking };
    }
  },

  // 5. Allocation Engine
  runAllocation: async (method: AllocationMethod): Promise<AllocationResult> => {
    try {
      return await request<AllocationResult>('/allocation/run', {
        method: 'POST',
        body: JSON.stringify({ method }),
      });
    } catch {
      // Simulate allocation run over mock bookings
      const unassignedBookings = mockBookings.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED');
      const assignments = [];
      const unassignedDetails = [];

      let assignedCount = 0;
      let totalCapacityWaste = 0;

      for (const booking of unassignedBookings) {
        // Find suitable room
        const suitableRoom = mockRooms.find(
          (r) => !r.isBlocked && r.capacity >= booking.enrollmentCount && booking.requiredFacilities.every((f) => r.facilities.includes(f))
        );

        if (suitableRoom) {
          booking.status = 'ALLOCATED';
          booking.assignedRoomId = suitableRoom.id;
          assignedCount++;
          const waste = suitableRoom.capacity - booking.enrollmentCount;
          totalCapacityWaste += waste;

          assignments.push({
            bookingId: booking.id,
            roomId: suitableRoom.id,
            explanation: `Assigned to ${suitableRoom.code} (${suitableRoom.name}). Capacity ${suitableRoom.capacity} fits ${booking.enrollmentCount} attendees (Waste: ${waste} seats). All ${booking.requiredFacilities.length} required facilities matched.`,
          });
        } else {
          unassignedDetails.push({
            bookingId: booking.id,
            reason: `No available room with capacity >= ${booking.enrollmentCount} and facilities [${booking.requiredFacilities.join(', ')}]`,
            evaluatedRoomsCount: mockRooms.length,
          });
        }
      }

      const totalRequested = unassignedBookings.length || mockBookings.length;
      const result: AllocationResult = {
        method,
        assignments,
        unassigned: unassignedDetails,
        metrics: {
          totalRequested,
          assignedCount,
          unassignedCount: unassignedDetails.length,
          capacityWasteAverage: assignedCount > 0 ? Math.round(totalCapacityWaste / assignedCount) : 0,
          executionTimeMs: method === 'FIRST_FIT' ? 14 : 38,
        },
        timestamp: new Date().toISOString(),
      };

      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'usr_runner',
        userRole: 'SYSTEM_ADMIN',
        action: 'RUN_ALLOCATION',
        resource: `Allocation Engine (${method})`,
        details: result.metrics as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });

      return result;
    }
  },

  // 6. Disruption & Recovery
  closeRoomAndRecover: async (roomId: string, reason: string): Promise<RecoveryReport> => {
    try {
      return await request<RecoveryReport>('/recovery/close-room', {
        method: 'POST',
        body: JSON.stringify({ roomId, reason }),
      });
    } catch {
      const room = mockRooms.find((r) => r.id === roomId);
      if (room) {
        room.isBlocked = true;
        room.blockReason = `Emergency Closure: ${reason}`;
      }

      // Find affected bookings assigned to this room
      const affected = mockBookings.filter((b) => b.assignedRoomId === roomId);
      const reassigned = [];
      const unresolved = [];

      for (const b of affected) {
        // Find alternative room
        const altRoom = mockRooms.find(
          (r) => r.id !== roomId && !r.isBlocked && r.capacity >= b.enrollmentCount && b.requiredFacilities.every((f) => r.facilities.includes(f))
        );

        if (altRoom) {
          b.assignedRoomId = altRoom.id;
          reassigned.push({
            bookingId: b.id,
            previousRoomId: roomId,
            newRoomId: altRoom.id,
            explanation: `Reassigned from closed room to ${altRoom.code} (${altRoom.name}). Preserved slot ${b.slot.startTime}-${b.slot.endTime}.`,
          });
        } else {
          b.status = 'PENDING';
          b.assignedRoomId = undefined;
          unresolved.push({
            bookingId: b.id,
            reason: 'No alternative room available matching slot and capacity requirements.',
          });
        }
      }

      const report: RecoveryReport = {
        closedRoomId: roomId,
        affectedBookingIds: affected.map((b) => b.id),
        reassignedBookings: reassigned,
        unresolvedBookingIds: unresolved,
        unaffectedAssignmentsPreservedCount: mockBookings.filter((b) => b.status === 'ALLOCATED' && b.assignedRoomId !== roomId).length,
        totalAssignmentsChangedCount: reassigned.length,
        timestamp: new Date().toISOString(),
      };

      mockAuditLogs.unshift({
        id: `log_${Date.now()}`,
        userId: 'usr_admin',
        userRole: 'SYSTEM_ADMIN',
        action: 'CLOSE_ROOM_DISRUPTION',
        resource: `Room ${room ? room.code : roomId}`,
        details: { reason, affectedCount: affected.length, reassignedCount: reassigned.length },
        timestamp: new Date().toISOString(),
      });

      return report;
    }
  },

  // 7. Metrics Comparison
  getMetricsComparison: async (): Promise<{
    firstFit: AllocationResult['metrics'];
    heuristic: AllocationResult['metrics'];
    improvementPercentage: { capacityEfficiency: number; executionSpeed: number };
  }> => {
    try {
      return await request<{
        firstFit: AllocationResult['metrics'];
        heuristic: AllocationResult['metrics'];
        improvementPercentage: { capacityEfficiency: number; executionSpeed: number };
      }>('/metrics/compare');
    } catch {
      return {
        firstFit: {
          totalRequested: 24,
          assignedCount: 18,
          unassignedCount: 6,
          capacityWasteAverage: 42,
          executionTimeMs: 12,
        },
        heuristic: {
          totalRequested: 24,
          assignedCount: 22,
          unassignedCount: 2,
          capacityWasteAverage: 14,
          executionTimeMs: 34,
        },
        improvementPercentage: {
          capacityEfficiency: 66.7,
          executionSpeed: -183.3,
        },
      };
    }
  },

  // 8. Audit Logs
  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    try {
      return await request<AuditLogEntry[]>('/audit-logs');
    } catch {
      return [...mockAuditLogs];
    }
  },

  // Utility: Hard Constraint Validator Helper
  validateHardConstraints: (booking: Partial<BookingRequest>, room: Room): HardConstraintValidationResult => {
    const violations: string[] = [];

    if (room.isBlocked) {
      violations.push(`Room ${room.code} is currently blocked (${room.blockReason || 'Maintenance'}).`);
    }

    if (booking.enrollmentCount && room.capacity < booking.enrollmentCount) {
      violations.push(`Room capacity (${room.capacity}) is smaller than requested attendance (${booking.enrollmentCount}).`);
    }

    if (booking.requiredFacilities && booking.requiredFacilities.length > 0) {
      const missing = booking.requiredFacilities.filter((f) => !room.facilities.includes(f));
      if (missing.length > 0) {
        violations.push(`Room ${room.code} lacks required facilities: ${missing.join(', ')}.`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  },
};
