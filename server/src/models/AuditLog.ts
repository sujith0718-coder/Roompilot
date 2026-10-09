import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, ALL_USER_ROLES } from '../../../shared/types/index.js';

export interface IAuditLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  userRole: UserRole;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    userRole: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: ALL_USER_ROLES,
        message: 'Role `{VALUE}` is invalid',
      },
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Useful query indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resource: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
