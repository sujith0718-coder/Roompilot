import mongoose, { Schema, Document } from 'mongoose';
import { TimeSlot, ALL_DAYS_OF_WEEK } from '../../../shared/types/index.js';

export interface IRoomClosureDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  reason: string;
  closedBy?: mongoose.Types.ObjectId;
  slot?: TimeSlot;
  status: 'ACTIVE' | 'RESOLVED';
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const ClosureSlotSchema = new Schema(
  {
    dayOfWeek: {
      type: String,
      required: true,
      enum: {
        values: ALL_DAYS_OF_WEEK,
        message: 'Day of week `{VALUE}` is invalid',
      },
    },
    startTime: {
      type: String,
      required: true,
      match: [timeRegex, 'Start time must be in HH:mm 24-hour format'],
    },
    endTime: {
      type: String,
      required: true,
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

const RoomClosureSchema = new Schema<IRoomClosureDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    reason: {
      type: String,
      required: [true, 'Closure reason is required'],
      trim: true,
      minlength: [3, 'Reason must be at least 3 characters'],
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    slot: {
      type: ClosureSlotSchema,
      default: undefined,
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
    },
    resolvedAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

RoomClosureSchema.index({ roomId: 1, status: 1 });
RoomClosureSchema.index({ status: 1 });
RoomClosureSchema.index({ createdAt: -1 });

export const RoomClosureModel = mongoose.model<IRoomClosureDocument>('RoomClosure', RoomClosureSchema);
