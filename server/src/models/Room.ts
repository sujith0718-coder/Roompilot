import mongoose, { Schema, Document } from 'mongoose';
import { Facility, ALL_FACILITIES } from '../../../shared/types/index.js';

export interface IRoomDocument extends Document {
  code: string;
  name: string;
  capacity: number;
  facilities: Facility[];
  building: string;
  floor: number;
  isBlocked: boolean;
  blockReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoomDocument>(
  {
    code: {
      type: String,
      required: [true, 'Room code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Room code must be at least 2 characters'],
      maxlength: [20, 'Room code cannot exceed 20 characters'],
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: [2, 'Room name must be at least 2 characters'],
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be an integer',
      },
    },
    facilities: {
      type: [
        {
          type: String,
          enum: {
            values: ALL_FACILITIES,
            message: 'Facility `{VALUE}` is not a supported facility',
          },
        },
      ],
      default: [],
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Floor must be an integer',
      },
    },
    isBlocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    blockReason: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Useful indexes
RoomSchema.index({ building: 1, floor: 1 });
RoomSchema.index({ capacity: 1 });
RoomSchema.index({ isBlocked: 1 });
RoomSchema.index({ facilities: 1 });

export const RoomModel = mongoose.model<IRoomDocument>('Room', RoomSchema);
