import { BookingRequest, Room, TimeSlot } from '../../../shared/types/index.js';

/**
 * DETERMINISTIC SHARED TEST FIXTURES
 * Used across unit tests, algorithm benchmarks, recovery tests, and validators.
 * LOCAL DEVELOPMENT & TESTING ONLY.
 */

export const mockRooms: Room[] = [
  {
    id: 'room-101',
    code: 'LH-101',
    name: 'Lecture Hall 101',
    capacity: 40,
    facilities: ['PROJECTOR', 'AC'],
    building: 'Main Academic Block',
    floor: 1,
    isBlocked: false,
  },
  {
    id: 'room-102',
    code: 'LH-102',
    name: 'Lecture Hall 102',
    capacity: 60,
    facilities: ['PROJECTOR', 'AC', 'AUDIO_SYSTEM'],
    building: 'Main Academic Block',
    floor: 1,
    isBlocked: false,
  },
  {
    id: 'room-201',
    code: 'LAB-201',
    name: 'Computing & Systems Lab',
    capacity: 30,
    facilities: ['LAB_EQUIPMENT', 'AC', 'PROJECTOR'],
    building: 'Technology Tower',
    floor: 2,
    isBlocked: false,
  },
  {
    id: 'room-202',
    code: 'SEM-202',
    name: 'Seminar Room 202',
    capacity: 25,
    facilities: ['PROJECTOR', 'SMART_BOARD'],
    building: 'Technology Tower',
    floor: 2,
    isBlocked: false,
  },
  {
    id: 'room-301',
    code: 'AUD-301',
    name: 'Main Auditorium',
    capacity: 120,
    facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC', 'SMART_BOARD', 'WHEELCHAIR_ACCESSIBLE'],
    building: 'Central Auditorium Block',
    floor: 1,
    isBlocked: false,
  },
  {
    id: 'room-999',
    code: 'BLOCKED-999',
    name: 'Annex Classroom 999 (Closed)',
    capacity: 50,
    facilities: ['PROJECTOR', 'AC'],
    building: 'Annex Block',
    floor: 1,
    isBlocked: true,
    blockReason: 'Maintenance: Emergency water pipe repair',
  },
];

export const slotMorning: TimeSlot = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '10:00',
  date: '2026-10-12',
};

export const slotMidday: TimeSlot = {
  dayOfWeek: 'MONDAY',
  startTime: '11:00',
  endTime: '12:00',
  date: '2026-10-12',
};

export const slotAfternoon: TimeSlot = {
  dayOfWeek: 'MONDAY',
  startTime: '14:00',
  endTime: '15:00',
  date: '2026-10-12',
};

export const mockBookingRequests: BookingRequest[] = [
  // 1. Suitable Room Case: 35 students, needs PROJECTOR -> fits room-101 or room-102
  {
    id: 'req-001',
    title: 'CS301 Data Structures Lecture',
    requesterId: 'usr-tutor-01',
    requesterRole: 'TUTOR',
    department: 'Computer Science',
    enrollmentCount: 35,
    requiredFacilities: ['PROJECTOR'],
    slot: slotMorning,
    status: 'PENDING',
    createdAt: '2026-10-09T08:00:00.000Z',
  },
  // 2. Insufficient Capacity Case: 200 students -> larger than any available room
  {
    id: 'req-002',
    title: 'Mega Orientation Assembly',
    requesterId: 'usr-admin-01',
    requesterRole: 'SYSTEM_ADMIN',
    department: 'Administration',
    enrollmentCount: 200,
    requiredFacilities: ['PROJECTOR'],
    slot: slotMorning,
    status: 'PENDING',
    createdAt: '2026-10-09T08:05:00.000Z',
  },
  // 3. Missing Facility Case: 25 students, requires LAB_EQUIPMENT
  {
    id: 'req-003',
    title: 'EE201 Microprocessors Practical',
    requesterId: 'usr-tutor-02',
    requesterRole: 'TUTOR',
    department: 'Electrical Engineering',
    enrollmentCount: 25,
    requiredFacilities: ['LAB_EQUIPMENT', 'PROJECTOR'],
    slot: slotMorning,
    status: 'PENDING',
    createdAt: '2026-10-09T08:10:00.000Z',
  },
  // 4. Overlapping Booking Case: Same slot as req-001 (slotMorning), competing for room-101
  {
    id: 'req-004',
    title: 'MATH201 Linear Algebra Tutorial',
    requesterId: 'usr-tutor-03',
    requesterRole: 'TUTOR',
    department: 'Mathematics',
    enrollmentCount: 38,
    requiredFacilities: ['PROJECTOR'],
    slot: slotMorning,
    status: 'PENDING',
    createdAt: '2026-10-09T08:15:00.000Z',
  },
  // 5. Large class with WHEELCHAIR_ACCESSIBLE: requires Auditorium
  {
    id: 'req-005',
    title: 'Annual Tech Symposium Keynote',
    requesterId: 'usr-event-01',
    requesterRole: 'EVENT_MANAGER',
    department: 'Student Affairs',
    enrollmentCount: 95,
    requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'WHEELCHAIR_ACCESSIBLE'],
    slot: slotAfternoon,
    status: 'PENDING',
    createdAt: '2026-10-09T08:20:00.000Z',
  },
  // 6. Seminar class: fits SEM-202 (capacity 25, SMART_BOARD)
  {
    id: 'req-006',
    title: 'MBA Executive Seminar',
    requesterId: 'usr-hod-01',
    requesterRole: 'HOD',
    department: 'Management Studies',
    enrollmentCount: 22,
    requiredFacilities: ['SMART_BOARD'],
    slot: slotMidday,
    status: 'PENDING',
    createdAt: '2026-10-09T08:25:00.000Z',
  },
];
