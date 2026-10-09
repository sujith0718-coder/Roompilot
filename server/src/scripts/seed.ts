import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  UserModel,
  RoomModel,
  BookingModel,
  RoomClosureModel,
  AllocationRunModel,
  AuditLogModel,
} from '../models/index.js';
import { Facility, UserRole } from '../../../shared/types/index.js';

export async function runSeed(isStandalone = true): Promise<void> {
  console.log('----------------------------------------------------');
  console.log('  RoomWise Repeatable Development Database Seeder   ');
  console.log('----------------------------------------------------');

  if (env.NODE_ENV !== 'development') {
    throw new Error('Database seeding is allowed only when NODE_ENV=development.');
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('This seed script clears existing collections. Set ALLOW_DESTRUCTIVE_SEED=true only when you intend to reset the development database.');
  }

  if (mongoose.connection.readyState === 0) {
    console.log(`Connecting to MongoDB at: ${env.MONGODB_URI}...`);
    await mongoose.connect(env.MONGODB_URI);
  }

  console.log('🧹 Purging existing sample data collections...');
  await Promise.all([
    UserModel.deleteMany({}),
    RoomModel.deleteMany({}),
    BookingModel.deleteMany({}),
    RoomClosureModel.deleteMany({}),
    AllocationRunModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);

  console.log('👤 Seeding 8 Internal Roles Demo Users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('DemoPass2026!', salt);

  const demoUsers = [
    {
      name: 'System Administrator',
      email: 'admin@campus.edu',
      passwordHash,
      role: 'SYSTEM_ADMIN' as UserRole,
      department: 'IT Administration',
    },
    {
      name: 'Dr. Arthur Vance (Principal)',
      email: 'principal@campus.edu',
      passwordHash,
      role: 'PRINCIPAL' as UserRole,
      department: 'Executive Administration',
    },
    {
      name: 'Prof. Karen Davies (HOD CS)',
      email: 'hod.cs@campus.edu',
      passwordHash,
      role: 'HOD' as UserRole,
      department: 'Computer Science',
    },
    {
      name: 'Dr. Leonard McCoy (Controller of Exams)',
      email: 'coe.exam@campus.edu',
      passwordHash,
      role: 'COE' as UserRole,
      department: 'Examination Cell',
    },
    {
      name: 'Sarah Connor (Student Secretary)',
      email: 'sec.arts@campus.edu',
      passwordHash,
      role: 'SECRETARY' as UserRole,
      department: 'Student Affairs',
    },
    {
      name: 'Marcus Brody (Event Manager)',
      email: 'event.mgr@campus.edu',
      passwordHash,
      role: 'EVENT_MANAGER' as UserRole,
      department: 'Campus Cultural Events',
    },
    {
      name: 'Alan Turing (Tutor / Lecturer)',
      email: 'tutor.smith@campus.edu',
      passwordHash,
      role: 'TUTOR' as UserRole,
      department: 'Computer Science',
    },
    {
      name: 'Elena Rostova (Student Representative)',
      email: 'rep.cs1@campus.edu',
      passwordHash,
      role: 'STUDENT_REP' as UserRole,
      department: 'Computer Science',
    },
  ];

  const createdUsers = await UserModel.insertMany(demoUsers);
  const userMap = new Map(createdUsers.map((u) => [u.email, u]));

  console.log('🏫 Seeding Synthetic Campus Rooms...');
  const demoRooms = [
    {
      code: 'MAIN-101',
      name: 'Main Auditorium',
      capacity: 180,
      facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC', 'WHEELCHAIR_ACCESSIBLE'] as Facility[],
      building: 'Main Block',
      floor: 1,
      isBlocked: false,
    },
    {
      code: 'MAIN-102',
      name: 'Smart Seminar Hall',
      capacity: 70,
      facilities: ['PROJECTOR', 'SMART_BOARD', 'AC', 'WHEELCHAIR_ACCESSIBLE'] as Facility[],
      building: 'Main Block',
      floor: 1,
      isBlocked: false,
    },
    {
      code: 'MAIN-201',
      name: 'General Lecture Hall 1',
      capacity: 50,
      facilities: ['PROJECTOR'] as Facility[],
      building: 'Main Block',
      floor: 2,
      isBlocked: false,
    },
    {
      code: 'ENG-101',
      name: 'Engineering Lecture Room 1 (Closed for HVAC)',
      capacity: 65,
      facilities: ['PROJECTOR', 'SMART_BOARD'] as Facility[],
      building: 'Engineering Hall',
      floor: 1,
      isBlocked: true,
      blockReason: 'HVAC pipe rupture maintenance',
    },
    {
      code: 'ENG-201',
      name: 'Advanced Computing Lab',
      capacity: 40,
      facilities: ['LAB_EQUIPMENT', 'PROJECTOR', 'AC'] as Facility[],
      building: 'Engineering Hall',
      floor: 2,
      isBlocked: false,
    },
    {
      code: 'ENG-202',
      name: 'Mechatronics Workshop',
      capacity: 35,
      facilities: ['LAB_EQUIPMENT', 'AUDIO_SYSTEM'] as Facility[],
      building: 'Engineering Hall',
      floor: 2,
      isBlocked: false,
    },
    {
      code: 'SCI-101',
      name: 'Science Lecture Amphitheater',
      capacity: 100,
      facilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC'] as Facility[],
      building: 'Science Complex',
      floor: 1,
      isBlocked: false,
    },
    {
      code: 'SCI-LAB2',
      name: 'Organic Chemistry Lab (Blocked for Audit)',
      capacity: 30,
      facilities: ['LAB_EQUIPMENT', 'AC'] as Facility[],
      building: 'Science Complex',
      floor: 2,
      isBlocked: true,
      blockReason: 'Hazardous chemicals safety compliance audit',
    },
    {
      code: 'SCI-301',
      name: 'Mathematics Tutorial Room',
      capacity: 30,
      facilities: ['SMART_BOARD'] as Facility[],
      building: 'Science Complex',
      floor: 3,
      isBlocked: false,
    },
  ];

  const createdRooms = await RoomModel.insertMany(demoRooms);
  const roomMap = new Map(createdRooms.map((r) => [r.code, r]));

  console.log('⚠️ Seeding Room Closures / Disruption Records...');
  const blockedEng101 = roomMap.get('ENG-101');
  const blockedSciLab2 = roomMap.get('SCI-LAB2');
  const adminUser = userMap.get('admin@campus.edu');

  if (blockedEng101 && adminUser) {
    await RoomClosureModel.create({
      roomId: blockedEng101._id,
      reason: 'HVAC pipe rupture maintenance',
      closedBy: adminUser._id,
      status: 'ACTIVE',
    });
  }

  if (blockedSciLab2 && adminUser) {
    await RoomClosureModel.create({
      roomId: blockedSciLab2._id,
      reason: 'Hazardous chemicals safety compliance audit',
      closedBy: adminUser._id,
      status: 'ACTIVE',
    });
  }

  console.log('📅 Seeding Synthetic Class Occurrences and Booking Requests...');
  const tutorUser = userMap.get('tutor.smith@campus.edu')!;
  const repUser = userMap.get('rep.cs1@campus.edu')!;
  const eventUser = userMap.get('event.mgr@campus.edu')!;
  const hodUser = userMap.get('hod.cs@campus.edu')!;
  const coeUser = userMap.get('coe.exam@campus.edu')!;

  const demoBookings = [
    {
      title: 'CS101: Introduction to Computer Systems',
      requesterId: tutorUser._id,
      requesterRole: tutorUser.role,
      department: 'Computer Science',
      enrollmentCount: 45,
      requiredFacilities: ['PROJECTOR'] as Facility[],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
      },
      status: 'APPROVED',
      assignedRoomId: roomMap.get('MAIN-201')?._id,
    },
    {
      title: 'CS201: Data Structures Lab Practical',
      requesterId: tutorUser._id,
      requesterRole: tutorUser.role,
      department: 'Computer Science',
      enrollmentCount: 38,
      requiredFacilities: ['LAB_EQUIPMENT', 'PROJECTOR'] as Facility[],
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '10:30',
        endTime: '12:30',
      },
      status: 'APPROVED',
      assignedRoomId: roomMap.get('ENG-201')?._id,
    },
    {
      title: 'CS305: Artificial Intelligence Seminar',
      requesterId: hodUser._id,
      requesterRole: hodUser.role,
      department: 'Computer Science',
      enrollmentCount: 60,
      requiredFacilities: ['PROJECTOR', 'SMART_BOARD', 'AC'] as Facility[],
      slot: {
        dayOfWeek: 'TUESDAY',
        startTime: '09:00',
        endTime: '11:00',
      },
      status: 'APPROVED',
      assignedRoomId: roomMap.get('MAIN-102')?._id,
    },
    {
      title: 'CS-STUDENT: Peer Coding Study Circle',
      requesterId: repUser._id,
      requesterRole: repUser.role,
      department: 'Computer Science',
      enrollmentCount: 25,
      requiredFacilities: ['SMART_BOARD'] as Facility[],
      slot: {
        dayOfWeek: 'WEDNESDAY',
        startTime: '14:00',
        endTime: '15:30',
      },
      status: 'PENDING',
    },
    {
      title: 'CLUB: Robotics Hackathon Tech Showcase',
      requesterId: eventUser._id,
      requesterRole: eventUser.role,
      department: 'Campus Cultural Events',
      enrollmentCount: 150,
      requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM', 'AC'] as Facility[],
      slot: {
        dayOfWeek: 'THURSDAY',
        startTime: '13:00',
        endTime: '17:00',
      },
      status: 'APPROVED',
      assignedRoomId: roomMap.get('MAIN-101')?._id,
    },
    {
      title: 'EXAM: Mid-Term Institutional Assessment',
      requesterId: coeUser._id,
      requesterRole: coeUser.role,
      department: 'Examination Cell',
      enrollmentCount: 95,
      requiredFacilities: ['PROJECTOR', 'AUDIO_SYSTEM'] as Facility[],
      slot: {
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        endTime: '12:00',
      },
      status: 'APPROVED',
      assignedRoomId: roomMap.get('SCI-101')?._id,
    },
    {
      title: 'MATH202: Multivariable Calculus Tutorial',
      requesterId: tutorUser._id,
      requesterRole: tutorUser.role,
      department: 'Computer Science',
      enrollmentCount: 28,
      requiredFacilities: ['SMART_BOARD'] as Facility[],
      slot: {
        dayOfWeek: 'FRIDAY',
        startTime: '14:00',
        endTime: '15:00',
      },
      status: 'PENDING',
    },
  ];

  await BookingModel.insertMany(demoBookings);

  console.log('📝 Seeding Audit Log Trail...');
  await AuditLogModel.create({
    userId: adminUser!._id,
    userRole: adminUser!.role,
    action: 'SYSTEM_SEED',
    resource: 'System:Database',
    details: {
      seededRoomsCount: createdRooms.length,
      seededUsersCount: createdUsers.length,
      seededBookingsCount: demoBookings.length,
      timestamp: new Date().toISOString(),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Sample Users Credentials (Password for all: DemoPass2026!):');
  for (const u of createdUsers) {
    console.log(`  - [${u.role.padEnd(14)}] ${u.email.padEnd(25)} (${u.name})`);
  }
  console.log('----------------------------------------------------');

  if (isStandalone) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Allow direct execution via tsx src/scripts/seed.ts
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Database seeding failed:', err);
      process.exit(1);
    });
}
