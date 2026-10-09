import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  UserModel,
  RoomModel,
  BookingModel,
  RoomClosureModel,
  AllocationRunModel,
} from '../models/index.js';

test('Mongoose Schema Validation Suite - Malformed Records Rejection', async (t) => {
  await t.test('UserModel: rejects malformed email address', async () => {
    const invalidUser = new UserModel({
      name: 'Test User',
      email: 'not-an-email',
      passwordHash: 'hash123',
      role: 'TUTOR',
    });

    const error = invalidUser.validateSync();
    assert.ok(error, 'Should produce validation error for invalid email');
    assert.ok(error.errors['email'], 'email field should have validation error');
  });

  await t.test('UserModel: rejects unsupported user role', async () => {
    const invalidUser = new UserModel({
      name: 'Test User',
      email: 'test@campus.edu',
      passwordHash: 'hash123',
      role: 'SUPER_ADMIN_CUSTOM', // Invalid role
    });

    const error = invalidUser.validateSync();
    assert.ok(error, 'Should produce validation error for invalid role');
    assert.ok(error.errors['role']);
  });

  await t.test('UserModel: accepts valid user document', async () => {
    const validUser = new UserModel({
      name: 'Prof. Ada Lovelace',
      email: 'ada@campus.edu',
      passwordHash: 'valid_bcrypt_hash',
      role: 'HOD',
      department: 'Computer Science',
    });

    const error = validUser.validateSync();
    assert.equal(error, undefined);
  });

  await t.test('RoomModel: rejects zero or negative capacity', async () => {
    const invalidRoom = new RoomModel({
      code: 'MAIN-001',
      name: 'Small Hall',
      capacity: 0, // Invalid: min is 1
      building: 'Main Block',
      floor: 1,
    });

    const error = invalidRoom.validateSync();
    assert.ok(error, 'Should reject capacity <= 0');
    assert.ok(error.errors['capacity']);
  });

  await t.test('RoomModel: rejects unsupported facility', async () => {
    const invalidRoom = new RoomModel({
      code: 'MAIN-002',
      name: 'Fancy Hall',
      capacity: 50,
      facilities: ['SWIMMING_POOL'], // Unsupported facility
      building: 'Main Block',
      floor: 1,
    });

    const error = invalidRoom.validateSync();
    assert.ok(error, 'Should reject unsupported facility');
    assert.ok(error.errors['facilities.0']);
  });

  await t.test('RoomModel: accepts valid room document', async () => {
    const validRoom = new RoomModel({
      code: 'MAIN-205',
      name: 'Multimedia Classroom',
      capacity: 65,
      facilities: ['PROJECTOR', 'AC', 'SMART_BOARD'],
      building: 'Main Block',
      floor: 2,
      isBlocked: false,
    });

    const error = validRoom.validateSync();
    assert.equal(error, undefined);
  });

  await t.test('BookingModel: rejects slot where endTime is before startTime', async () => {
    const invalidBooking = new BookingModel({
      title: 'Backwards Time Class',
      requesterId: new mongoose.Types.ObjectId(),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '11:00',
        endTime: '10:00', // Invalid: endTime before startTime
      },
    });

    const error = invalidBooking.validateSync();
    assert.ok(error, 'Should reject backwards time slot');
    assert.ok(error.errors['slot.endTime']);
  });

  await t.test('BookingModel: rejects malformed 24h time format', async () => {
    const invalidBooking = new BookingModel({
      title: 'Invalid Time Format',
      requesterId: new mongoose.Types.ObjectId(),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      slot: {
        dayOfWeek: 'MONDAY',
        startTime: '9:00 AM', // Not HH:mm format
        endTime: '10:00 AM',
      },
    });

    const error = invalidBooking.validateSync();
    assert.ok(error, 'Should reject non-24h HH:mm time format');
    assert.ok(error.errors['slot.startTime']);
  });

  await t.test('BookingModel: rejects invalid dayOfWeek', async () => {
    const invalidBooking = new BookingModel({
      title: 'Invalid Day Booking',
      requesterId: new mongoose.Types.ObjectId(),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      slot: {
        dayOfWeek: 'SOMEDAY', // Invalid day
        startTime: '09:00',
        endTime: '10:00',
      },
    });

    const error = invalidBooking.validateSync();
    assert.ok(error, 'Should reject invalid dayOfWeek');
    assert.ok(error.errors['slot.dayOfWeek']);
  });

  await t.test('BookingModel: accepts valid booking request document', async () => {
    const validBooking = new BookingModel({
      title: 'CS301 Algorithms Lecture',
      requesterId: new mongoose.Types.ObjectId(),
      requesterRole: 'TUTOR',
      department: 'Computer Science',
      enrollmentCount: 45,
      requiredFacilities: ['PROJECTOR'],
      slot: {
        dayOfWeek: 'TUESDAY',
        startTime: '09:00',
        endTime: '10:30',
      },
      status: 'PENDING',
    });

    const error = validBooking.validateSync();
    assert.equal(error, undefined);
  });

  await t.test('RoomClosureModel: rejects missing required fields', async () => {
    const invalidClosure = new RoomClosureModel({});
    const error = invalidClosure.validateSync();
    assert.ok(error);
    assert.ok(error.errors['roomId']);
    assert.ok(error.errors['reason']);
  });

  await t.test('AllocationRunModel: rejects unsupported allocation method', async () => {
    const invalidRun = new AllocationRunModel({
      method: 'GENETIC_ALGORITHM', // Not FIRST_FIT or HEURISTIC
      metrics: {
        totalRequested: 10,
        assignedCount: 8,
        unassignedCount: 2,
        capacityWasteAverage: 5,
        executionTimeMs: 12,
      },
    });

    const error = invalidRun.validateSync();
    assert.ok(error);
    assert.ok(error.errors['method']);
  });
});
