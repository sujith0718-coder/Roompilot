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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ALL_USER_ROLES,
        message: 'Role `{VALUE}` is not a recognized internal role',
      },
    },
    department: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Useful indexes
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
