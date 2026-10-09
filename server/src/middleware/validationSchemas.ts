import { z } from 'zod';
import {
  ALL_FACILITIES,
  ALL_DAYS_OF_WEEK,
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

export const validateAllocationSchema = z.object({
  assignments: z.array(
    z.object({
      bookingId: z.string().min(1, 'Booking ID is required'),
      roomId: z.string().min(1, 'Room ID is required'),
      explanation: z.string().optional().default('Candidate assignment'),
    })
  ),
  requests: z.array(z.any()).optional(),
  rooms: z.array(z.any()).optional(),
  closures: z.array(z.any()).optional(),
});
