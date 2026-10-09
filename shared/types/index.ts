/**
 * RoomWise Domain and API Types
 * Standardized across client and server.
 */

// Fixed 8 Internal Role Identifiers
export type UserRole =
  | 'TUTOR'
  | 'STUDENT_REP'
  | 'EVENT_MANAGER'
  | 'SECRETARY'
  | 'HOD'
  | 'COE'
  | 'PRINCIPAL'
  | 'SYSTEM_ADMIN';

export const ALL_USER_ROLES: UserRole[] = [
  'TUTOR',
  'STUDENT_REP',
  'EVENT_MANAGER',
  'SECRETARY',
  'HOD',
  'COE',
  'PRINCIPAL',
  'SYSTEM_ADMIN',
];

// User Domain Contract
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt?: string;
}

export type Facility =
  | 'PROJECTOR'
  | 'LAB_EQUIPMENT'
  | 'AUDIO_SYSTEM'
  | 'AC'
  | 'SMART_BOARD'
  | 'WHEELCHAIR_ACCESSIBLE';

export const ALL_FACILITIES: Facility[] = [
  'PROJECTOR',
  'LAB_EQUIPMENT',
  'AUDIO_SYSTEM',
  'AC',
  'SMART_BOARD',
  'WHEELCHAIR_ACCESSIBLE',
];

export interface Room {
  id: string;
  code: string;
  name: string;
  capacity: number;
  facilities: Facility[];
  building: string;
  floor: number;
  isBlocked: boolean;
  blockReason?: string;
}

// Time Slot & Schedule Contracts
export interface TimeSlot {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string; // ISO 8601 time format HH:mm (e.g., "09:00")
  endTime: string;   // ISO 8601 time format HH:mm (e.g., "10:00")
  date?: string;      // Optional YYYY-MM-DD for specific occurrence
}

export const ALL_DAYS_OF_WEEK: TimeSlot['dayOfWeek'][] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

// Booking Request & Status Contracts
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALLOCATED' | 'CANCELLED';

export const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ALLOCATED',
  'CANCELLED',
];

export interface BookingRequest {
  id: string;
  title: string;
  requesterId: string;
  requesterRole: UserRole;
  department?: string;
  enrollmentCount: number;
  requiredFacilities: Facility[];
  slot: TimeSlot;
  status: BookingStatus;
  assignedRoomId?: string;
  unassignedReason?: string;
  createdAt?: string;
}

// Hard Constraint Validation Result
export type ConstraintViolationType =
  | 'CAPACITY'
  | 'FACILITY'
  | 'ROOM_CLOSED'
  | 'OVERLAP'
  | 'DUPLICATE_ASSIGNMENT'
  | 'MISSING_ROOM'
  | 'MISSING_BOOKING';

export interface ConstraintViolationDetail {
  bookingId?: string;
  roomId?: string;
  reason: string;
  constraintType: ConstraintViolationType;
}

export interface HardConstraintValidationResult {
  isValid: boolean;
  violations: string[];
  details?: ConstraintViolationDetail[];
}

// Allocation Algorithm Types
export type AllocationMethod = 'FIRST_FIT' | 'HEURISTIC';

export interface AllocationAssignment {
  bookingId: string;
  roomId: string;
  explanation: string;
}

export interface UnassignedBookingDetail {
  bookingId: string;
  reason: string;
  evaluatedRoomsCount: number;
}

export interface AllocationResult {
  runId?: string;
  method: AllocationMethod;
  assignments: AllocationAssignment[];
  unassigned: UnassignedBookingDetail[];
  metrics: {
    totalRequested: number;
    assignedCount: number;
    unassignedCount: number;
    capacityWasteAverage: number;
    executionTimeMs: number;
  };
  validation?: HardConstraintValidationResult;
  timestamp: string;
}

export interface AllocationRunRecord {
  id?: string;
  method: AllocationMethod;
  result: AllocationResult;
  triggeredBy?: string;
  status: 'SUCCESS' | 'FAILED';
  createdAt?: string;
}

// Recovery & Disruption Domain Contracts
export interface DisruptionEvent {
  roomId: string;
  slot?: TimeSlot;
  reason: string;
}

export interface RoomClosure {
  id?: string;
  roomId: string;
  reason: string;
  closedBy?: string;
  slot?: TimeSlot;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt?: string;
  resolvedAt?: string;
}

export interface RecoveryReport {
  closedRoomId: string;
  affectedBookingIds: string[];
  reassignedBookings: {
    bookingId: string;
    previousRoomId: string;
    newRoomId: string;
    explanation: string;
  }[];
  unresolvedBookingIds: {
    bookingId: string;
    reason: string;
  }[];
  unaffectedAssignmentsPreservedCount: number;
  totalAssignmentsChangedCount: number;
  timestamp: string;
}

// Audit Log Domain Contract
export interface AuditLogEntry {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Standard API Response Contracts
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Authentication Request & Response Contracts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt?: string;
}

export interface LoginResponseData {
  user: User;
  token: string;
}

export interface CurrentUserResponseData {
  user: User;
}

