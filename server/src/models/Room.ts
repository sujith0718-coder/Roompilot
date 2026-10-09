import mongoose, { Schema, Document } from 'mongoose';
import { Facility } from '../../../shared/types/index.js';

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
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    facilities: [{ type: String, required: true }],
    building: { type: String, required: true, trim: true },
    floor: { type: Number, required: true, default: 0 },
    isBlocked: { type: Boolean, required: true, default: false },
    blockReason: { type: String },
  },
  { timestamps: true }
);

export const RoomModel = mongoose.model<IRoomDocument>('Room', RoomSchema);
