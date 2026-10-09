import mongoose, { Schema, Document } from 'mongoose';
import {
  UserRole,
  ALL_USER_ROLES,
  BookingStatus,
  ALL_BOOKING_STATUSES,
  Facility,
  ALL_FACILITIES,
  TimeSlot,
  ALL_DAYS_OF_WEEK,
} from '../../../shared/types/index.js';

export interface IBookingDocument extends Document {
  title: string;
  requesterId: mongoose.Types.ObjectId;
  requesterRole: UserRole;
  department?: string;
  enrollmentCount: number;
  requiredFacilities: Facility[];
  slot: TimeSlot;
  status: BookingStatus;
  assignedRoomId?: mongoose.Types.ObjectId;
  unassignedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const TimeSlotSchema = new Schema(
  {
    dayOfWeek: {
      type: String,
      required: [true, 'Slot day of week is required'],
      enum: {
        values: ALL_DAYS_OF_WEEK,
        message: 'Day of week `{VALUE}` is invalid',
      },
    },
    startTime: {
      type: String,
      required: [true, 'Slot start time is required'],
      match: [timeRegex, 'Start time must be in HH:mm 24-hour format'],
    },
    endTime: {
      type: String,
      required: [true, 'Slot end time is required'],
      match: [timeRegex, 'End time must be in HH:mm 24-hour format'],
    },
    date: {
      type: String,
      match: [dateRegex, 'Date must be in YYYY-MM-DD format'],
      default: undefined,
    },
  },
  { _id: false }
);

TimeSlotSchema.path('endTime').validate(function (this: { startTime: string; endTime: string }, value: string) {
  if (!this.startTime || !value) return true;
  return this.startTime < value;
}, 'End time must be after start time');

const BookingSchema = new Schema<IBookingDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester ID is required'],
    },
    requesterRole: {
      type: String,
      required: [true, 'Requester role is required'],
      enum: {
        values: ALL_USER_ROLES,
        message: 'Requester role `{VALUE}` is invalid',
      },
    },
    department: {
      type: String,
      trim: true,
      default: undefined,
    },
    enrollmentCount: {
      type: Number,
      required: [true, 'Enrollment count is required'],
      min: [1, 'Enrollment count must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Enrollment count must be an integer',
      },
    },
    requiredFacilities: {
      type: [
        {
          type: String,
          enum: {
            values: ALL_FACILITIES,
            message: 'Required facility `{VALUE}` is not supported',
          },
        },
      ],
      default: [],
    },
    slot: {
      type: TimeSlotSchema,
      required: [true, 'Time slot schedule is required'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ALL_BOOKING_STATUSES,
        message: 'Status `{VALUE}` is invalid',
      },
      default: 'PENDING',
    },
    assignedRoomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      default: undefined,
    },
    unassignedReason: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Useful query indexes
BookingSchema.index({ requesterId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ department: 1 });
BookingSchema.index({ assignedRoomId: 1 });
BookingSchema.index({ 'slot.dayOfWeek': 1, 'slot.startTime': 1 });
BookingSchema.index({ 'slot.date': 1 });
BookingSchema.index(
  { assignedRoomId: 1, 'slot.dayOfWeek': 1, 'slot.startTime': 1, 'slot.endTime': 1 },
  { sparse: true }
);

export const BookingModel = mongoose.model<IBookingDocument>('Booking', BookingSchema);
