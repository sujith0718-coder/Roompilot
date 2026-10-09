import { z } from 'zod';
import {
  ALL_FACILITIES,
  ALL_DAYS_OF_WEEK,
  ALL_USER_ROLES,
  UserRole,
  Facility,
  TimeSlot,
} from '../../../shared/types/index.js';

const facilityEnum = z.enum(ALL_FACILITIES as [Facility, ...Facility[]]);
const dayOfWeekEnum = z.enum(
  ALL_DAYS_OF_WEEK as [TimeSlot['dayOfWeek'], ...TimeSlot['dayOfWeek'][]]
);

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const createRoomSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 chars').max(20).trim(),
  name: z.string().min(2, 'Name must be at least 2 chars').max(100).trim(),
  capacity: z.number().int('Capacity must be integer').min(1, 'Capacity must be at least 1'),
  facilities: z.array(facilityEnum).default([]),
  building: z.string().min(1, 'Building is required').trim(),
  floor: z.number().int().default(0),
  isBlocked: z.boolean().optional().default(false),
  blockReason: z.string().trim().optional(),
});

export const blockRoomSchema = z.object({
  isBlocked: z.boolean(),
  reason: z.string().trim().optional(),
});

export const timeSlotSchema = z
  .object({
    dayOfWeek: dayOfWeekEnum,
    startTime: z.string().regex(timePattern, 'Start time must be in HH:mm 24h format'),
    endTime: z.string().regex(timePattern, 'End time must be in HH:mm 24h format'),
    date: z.string().regex(datePattern, 'Date must be YYYY-MM-DD').optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Slot endTime must be strictly after startTime',
    path: ['endTime'],
  });

export const createBookingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 chars').max(150).trim(),
  enrollmentCount: z.number().int().min(1, 'Enrollment count must be at least 1'),
  requiredFacilities: z.array(facilityEnum).default([]),
  slot: timeSlotSchema,
  department: z.string().trim().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  reason: z.string().trim().optional(),
});

export const roomClosureInputSchema = z.object({
  id: z.string().optional(),
  roomId: z.string().min(1, 'Room ID is required'),
  reason: z.string().min(1, 'Closure reason is required'),
  closedBy: z.string().optional(),
  slot: timeSlotSchema.optional(),
  status: z.enum(['ACTIVE', 'RESOLVED']).optional().default('ACTIVE'),
});

export const bookingRequestInputSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
  title: z.string().min(1, 'Title is required'),
  requesterId: z.string().optional(),
  requesterRole: z.enum(ALL_USER_ROLES as [UserRole, ...UserRole[]]).optional(),
  department: z.string().optional(),
  enrollmentCount: z.number().int().min(1, 'Enrollment count must be at least 1'),
  requiredFacilities: z.array(facilityEnum).optional().default([]),
  slot: timeSlotSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALLOCATED', 'CANCELLED']).optional(),
  assignedRoomId: z.string().optional(),
});

export const roomInputSchema = z.object({
  id: z.string().min(1, 'Room ID is required'),
  code: z.string().min(1, 'Room code is required'),
  name: z.string().optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  facilities: z.array(facilityEnum).optional().default([]),
  building: z.string().optional(),
  floor: z.number().int().optional().default(0),
  isBlocked: z.boolean().optional().default(false),
  blockReason: z.string().optional(),
});

export const validateAllocationSchema = z.object({
  assignments: z.array(
    z.object({
      bookingId: z.string().min(1, 'Booking ID is required'),
      roomId: z.string().min(1, 'Room ID is required'),
      explanation: z.string().optional().default('Candidate assignment'),
    })
  ),
  requests: z.array(bookingRequestInputSchema).optional(),
  rooms: z.array(roomInputSchema).optional(),
  closures: z.array(roomClosureInputSchema).optional(),
});

export const runAllocationSchema = z.object({
  method: z.enum(['FIRST_FIT', 'HEURISTIC']).optional().default('HEURISTIC'),
  requests: z.array(bookingRequestInputSchema).optional(),
  rooms: z.array(roomInputSchema).optional(),
  closures: z.array(roomClosureInputSchema).optional(),
});

export const reassignDisruptionSchema = z.object({
  event: z
    .object({
      roomId: z.string().min(1, 'Room ID is required').trim(),
      reason: z.string().min(3, 'Reason must be at least 3 characters').max(500).trim(),
      slot: timeSlotSchema.optional(),
    })
    .strict(),
}).strict();
