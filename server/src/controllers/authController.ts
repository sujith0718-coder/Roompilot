import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  UserRole,
  User,
  ApiSuccess,
  LoginResponseData,
  CurrentUserResponseData,
} from '../../../shared/types/index.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
}).strict();

// Demo fallback user mapping for development / disconnected DB mode
const DEMO_FALLBACK_ACCOUNTS: Record<string, { name: string; role: UserRole; department: string }> = {
  'admin@campus.edu': { name: 'System Administrator', role: 'SYSTEM_ADMIN', department: 'IT Administration' },
  'principal@campus.edu': { name: 'Dr. Arthur Vance (Principal)', role: 'PRINCIPAL', department: 'Executive Administration' },
  'hod.cs@campus.edu': { name: 'Prof. Karen Davies (HOD CS)', role: 'HOD', department: 'Computer Science' },
  'coe.exam@campus.edu': { name: 'Dr. Leonard McCoy (Controller of Exams)', role: 'COE', department: 'Examination Cell' },
  'coe@campus.edu': { name: 'Dr. Leonard McCoy (Controller of Exams)', role: 'COE', department: 'Examination Cell' },
  'sec.arts@campus.edu': { name: 'Sarah Connor (Student Secretary)', role: 'SECRETARY', department: 'Student Affairs' },
  'secretary@campus.edu': { name: 'Sarah Connor (Student Secretary)', role: 'SECRETARY', department: 'Student Affairs' },
  'event.mgr@campus.edu': { name: 'Marcus Brody (Event Manager)', role: 'EVENT_MANAGER', department: 'Campus Cultural Events' },
  'events@campus.edu': { name: 'Marcus Brody (Event Manager)', role: 'EVENT_MANAGER', department: 'Campus Cultural Events' },
  'tutor.smith@campus.edu': { name: 'Alan Turing (Tutor / Lecturer)', role: 'TUTOR', department: 'Computer Science' },
  'turing@campus.edu': { name: 'Alan Turing (Tutor / Lecturer)', role: 'TUTOR', department: 'Computer Science' },
  'tutor@campus.edu': { name: 'Alan Turing (Tutor / Lecturer)', role: 'TUTOR', department: 'Computer Science' },
  'rep.cs1@campus.edu': { name: 'Elena Rostova (Student Representative)', role: 'STUDENT_REP', department: 'Computer Science' },
  'studentrep@campus.edu': { name: 'Elena Rostova (Student Representative)', role: 'STUDENT_REP', department: 'Computer Science' },
};

/**
 * Controller: Authenticate user, verify password hash, and issue JWT session token.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const normalizedEmail = email.toLowerCase().trim();

    let authenticatedUser: User | null = null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const userDoc = await UserModel.findOne({ email: normalizedEmail });
      if (!userDoc || !(await bcrypt.compare(password, userDoc.passwordHash))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      authenticatedUser = {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        department: userDoc.department,
        createdAt: userDoc.createdAt?.toISOString(),
      };
    } else if (env.NODE_ENV === 'development') {
      // Local-only fallback for a known synthetic account when MongoDB is unavailable.
      // Never enable this fallback in test or production environments.
      const fallback = DEMO_FALLBACK_ACCOUNTS[normalizedEmail];
      if (!fallback || password !== 'DemoPass2026!') {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      authenticatedUser = {
        id: `demo_${fallback.role.toLowerCase()}`,
        name: fallback.name,
        email: normalizedEmail,
        role: fallback.role,
        department: fallback.department,
        createdAt: new Date().toISOString(),
      };
    } else {
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication requires a database connection');
    }

    // Issue signed JWT token containing server-verified user identity & role
    const tokenPayload = {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      department: authenticatedUser.department,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });


    const response: ApiSuccess<LoginResponseData> = {
      success: true,
      data: {
        user: authenticatedUser,
        token,
      },
      message: 'User authenticated successfully',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Terminate current user session.
 */
export const logout = (_req: Request, res: Response): void => {
  const response: ApiSuccess<null> = {
    success: true,
    data: null,
    message: 'User session successfully terminated',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
};

/**
 * Controller: Return the current authenticated user's session and verified role.
 * Derived strictly from verified JWT token via auth middleware.
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required');
    }

    let currentUser: User = {
      id: req.user.id,
      name: req.user.email.split('@')[0],
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
    };

    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected && mongoose.isValidObjectId(req.user.id)) {
      const userDoc = await UserModel.findById(req.user.id);
      if (userDoc) {
        currentUser = {
          id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          department: userDoc.department,
          createdAt: userDoc.createdAt?.toISOString(),
        };
      }
    } else {
      const fallback = DEMO_FALLBACK_ACCOUNTS[req.user.email.toLowerCase()];
      if (fallback) {
        currentUser.name = fallback.name;
        currentUser.department = fallback.department;
      }
    }

    const response: ApiSuccess<CurrentUserResponseData> = {
      success: true,
      data: {
        user: currentUser,
      },
      message: 'Current authenticated user profile retrieved',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
