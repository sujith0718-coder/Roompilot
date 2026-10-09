import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, ALL_USER_ROLES, BookingStatus, Facility } from '../../../shared/types/index.js';

export interface IBookingDocument extends Document {
  title: string;
  requesterId: mongoose.Types.ObjectId;
  requesterRole: UserRole;
  department?: string;
  enrollmentCount: number;
  requiredFacilities: Facility[];
  slot: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    date?: string;
  };
  status: BookingStatus;
  assignedRoomId?: mongoose.Types.ObjectId;
  unassignedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
  {
    title: { type: String, required: true, trim: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterRole: { type: String, required: true, enum: ALL_USER_ROLES },
    department: { type: String, trim: true },
    enrollmentCount: { type: Number, required: true, min: 1 },
    requiredFacilities: [{ type: String }],
    slot: {
      dayOfWeek: { type: String, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      date: { type: String },
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'ALLOCATED', 'CANCELLED'],
      default: 'PENDING',
    },
    assignedRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    unassignedReason: { type: String },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.model<IBookingDocument>('Booking', BookingSchema);
