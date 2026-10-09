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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, required: true, enum: ALL_USER_ROLES },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
