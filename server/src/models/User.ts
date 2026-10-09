import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, ALL_USER_ROLES } from '../../../shared/types/index.js';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ALL_USER_ROLES },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
