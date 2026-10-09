import mongoose, { Schema, Document } from 'mongoose';
import { AllocationMethod, AllocationResult } from '../../../shared/types/index.js';

export interface IAllocationRunDocument extends Document {
  method: AllocationMethod;
  assignments: {
    bookingId: mongoose.Types.ObjectId | string;
    roomId: mongoose.Types.ObjectId | string;
    explanation: string;
  }[];
  unassigned: {
    bookingId: mongoose.Types.ObjectId | string;
    reason: string;
    evaluatedRoomsCount: number;
  }[];
  metrics: {
    totalRequested: number;
    assignedCount: number;
    unassignedCount: number;
    capacityWasteAverage: number;
    executionTimeMs: number;
  };
  status: 'SUCCESS' | 'FAILED';
  triggeredBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.Mixed, required: true },
    roomId: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const UnassignedSchema = new Schema(
  {
    bookingId: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, required: true },
    evaluatedRoomsCount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const AllocationRunSchema = new Schema<IAllocationRunDocument>(
  {
    method: {
      type: String,
      required: [true, 'Allocation method is required'],
      enum: ['FIRST_FIT', 'HEURISTIC'],
    },
    assignments: {
      type: [AssignmentSchema],
      default: [],
    },
    unassigned: {
      type: [UnassignedSchema],
      default: [],
    },
    metrics: {
      totalRequested: { type: Number, required: true, default: 0 },
      assignedCount: { type: Number, required: true, default: 0 },
      unassignedCount: { type: Number, required: true, default: 0 },
      capacityWasteAverage: { type: Number, required: true, default: 0 },
      executionTimeMs: { type: Number, required: true, default: 0 },
    },
    status: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
  },
  { timestamps: true }
);

AllocationRunSchema.index({ method: 1 });
AllocationRunSchema.index({ status: 1 });
AllocationRunSchema.index({ createdAt: -1 });

export const AllocationRunModel = mongoose.model<IAllocationRunDocument>(
  'AllocationRun',
  AllocationRunSchema
);
