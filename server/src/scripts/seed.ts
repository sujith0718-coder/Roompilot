/**
 * ROOMWISE SYNTHETIC DATA SEED SCRIPT
 * LOCAL DEVELOPMENT & DEMONSTRATION USE ONLY.
 * NEVER USE IN PRODUCTION ENVIRONMENTS.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/User.js';
import { RoomModel } from '../models/Room.js';
import { BookingModel } from '../models/Booking.js';
import { mockRooms, mockBookingRequests } from '../../tests/fixtures/sharedFixtures.js';
import { ALL_USER_ROLES, UserRole } from '../../../shared/types/index.js';

export const LOCAL_DEV_DEFAULT_PASSWORD = 'RoomWiseDev2026!';

export interface SeedUserDefinition {
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export const syntheticUsers: SeedUserDefinition[] = [
  { name: 'Dr. Alan Turing (Tutor)', email: 'tutor@campus.edu', role: 'TUTOR', department: 'Computer Science' },
  { name: 'Grace Hopper (Student Rep)', email: 'student_rep@campus.edu', role: 'STUDENT_REP', department: 'Computer Science' },
  { name: 'Ada Lovelace (Event Mgr)', email: 'event_manager@campus.edu', role: 'EVENT_MANAGER', department: 'Student Affairs' },
  { name: 'Claude Shannon (Secretary)', email: 'secretary@campus.edu', role: 'SECRETARY', department: 'Student Affairs' },
  { name: 'Prof. Margaret Hamilton (HOD)', email: 'hod@campus.edu', role: 'HOD', department: 'Computer Science' },
  { name: 'Dr. John von Neumann (COE)', email: 'coe@campus.edu', role: 'COE', department: 'Examinations Office' },
  { name: 'Prof. Katherine Johnson (Principal)', email: 'principal@campus.edu', role: 'PRINCIPAL', department: 'Executive Directorate' },
  { name: 'Linus Torvalds (System Admin)', email: 'admin@campus.edu', role: 'SYSTEM_ADMIN', department: 'Information Systems' },
];

export async function runSeed(): Promise<void> {
  console.log('=====================================================');
  console.log(' 🌱 RoomWise Local Development Seed Script');
  console.log(' ⚠️  NOTICE: Synthetic development benchmark data only.');
  console.log('=====================================================');

  const conn = await connectDB();

  const dataOutputDir = path.resolve(process.cwd(), 'src/data');
  if (!fs.existsSync(dataOutputDir)) {
    fs.mkdirSync(dataOutputDir, { recursive: true });
  }

  const exportPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      environment: 'development-only',
      note: 'Synthetic benchmark dataset for RoomWise allocation and recovery testing',
    },
    users: syntheticUsers.map((u) => ({ ...u, passwordPlaceholder: LOCAL_DEV_DEFAULT_PASSWORD })),
    rooms: mockRooms,
    bookingRequests: mockBookingRequests,
  };

  fs.writeFileSync(
    path.join(dataOutputDir, 'syntheticSampleData.json'),
    JSON.stringify(exportPayload, null, 2),
    'utf-8'
  );
  console.log(`📁 Local synthetic sample data export written to src/data/syntheticSampleData.json`);

  if (!conn || mongoose.connection.readyState !== 1) {
    console.warn('⚠️  MongoDB connection unavailable. Seed data saved locally as JSON for offline testing.');
    return;
  }

  try {
    console.log('🧹 Purging existing development database collections...');
    await Promise.all([
      UserModel.deleteMany({}),
      RoomModel.deleteMany({}),
      BookingModel.deleteMany({}),
    ]);

    console.log('🔐 Hashing default development credentials...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(LOCAL_DEV_DEFAULT_PASSWORD, salt);

    console.log('👤 Seeding 8 standard role users...');
    const createdUsers = await UserModel.insertMany(
      syntheticUsers.map((u) => ({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        department: u.department,
      }))
    );

    const tutorUser = createdUsers.find((u) => u.role === 'TUTOR') || createdUsers[0];

    console.log(`🏢 Seeding ${mockRooms.length} classrooms and specialized facilities...`);
    await RoomModel.insertMany(
      mockRooms.map((r) => ({
        code: r.code,
        name: r.name,
        capacity: r.capacity,
        facilities: r.facilities,
        building: r.building,
        floor: r.floor,
        isBlocked: r.isBlocked,
        blockReason: r.blockReason,
      }))
    );

    console.log(`📝 Seeding ${mockBookingRequests.length} representative booking requests...`);
    await BookingModel.insertMany(
      mockBookingRequests.map((b) => ({
        title: b.title,
        requesterId: tutorUser._id,
        requesterRole: b.requesterRole,
        department: b.department,
        enrollmentCount: b.enrollmentCount,
        requiredFacilities: b.requiredFacilities,
        slot: b.slot,
        status: b.status,
      }))
    );

    console.log('✅ Seed completed successfully!');
    console.log('🔑 Development Credentials:');
    for (const u of syntheticUsers) {
      console.log(`   - [${u.role.padEnd(14)}] Email: ${u.email.padEnd(25)} Pass: ${LOCAL_DEV_DEFAULT_PASSWORD}`);
    }
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed.');
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed().catch((err) => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
}
