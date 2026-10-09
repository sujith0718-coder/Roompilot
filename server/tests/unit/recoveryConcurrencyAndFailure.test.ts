import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { recoveryService } from '../../src/services/recovery/index.js';
import { BookingModel, RoomModel, RoomClosureModel, AuditLogModel, UserModel } from '../../src/models/index.js';
import { TimeSlot } from '../../../shared/types/index.js';

describe('Disruption Recovery — Concurrency, Atomicity & Failure Injection Suite', () => {
  const actorId = '507f1f77bcf86cd799439008';
  const closedRoomId = '507f1f77bcf86cd799439011';
  const destRoomId = '507f1f77bcf86cd799439012';

  const slotMorning: TimeSlot = {
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:30',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (mongoose.connection as any).db;
  });

  it('Failure Injection: Booking update failure aborts transaction and reverts state', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    (mongoose.connection as any).db = {
      admin: () => ({
        command: vi.fn().mockResolvedValue({ setName: 'rs0' }),
      }),
      collection: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(actorId), role: 'SYSTEM_ADMIN' }),
    } as any);

    vi.spyOn(RoomModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        name: 'Lecture Hall 101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    const bookingInClosedRoom = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
      title: 'Operating Systems',
      requesterId: new mongoose.Types.ObjectId(actorId),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: new mongoose.Types.ObjectId(closedRoomId),
      createdAt: new Date(),
    };

    vi.spyOn(BookingModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue(bookingInClosedRoom),
    } as any);

    vi.spyOn(RoomModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    vi.spyOn(BookingModel, 'find').mockImplementation((query: any) => {
      if (query?.assignedRoomId) {
        return { lean: vi.fn().mockResolvedValue([]) } as any;
      }
      return { lean: vi.fn().mockResolvedValue([bookingInClosedRoom]) } as any;
    });

    vi.spyOn(RoomModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(closedRoomId),
          code: 'LH-101',
          name: 'Lecture Hall 101',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
        {
          _id: new mongoose.Types.ObjectId(destRoomId),
          code: 'LH-102',
          name: 'Lecture Hall 102',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
      ]),
    } as any);

    vi.spyOn(RoomClosureModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'updateOne').mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);
    vi.spyOn(RoomClosureModel, 'create').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as any);

    // INJECT FAILURE: BookingModel.updateOne fails
    vi.spyOn(BookingModel, 'updateOne').mockRejectedValueOnce(new Error('Simulated booking database write failure'));

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: closedRoomId, reason: 'Ceiling leak' },
        { actor: { id: actorId, role: 'SYSTEM_ADMIN' } }
      )
    ).rejects.toThrow('Simulated booking database write failure');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
  });

  it('Failure Injection: Closure persistence failure aborts transaction with no partial changes', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    (mongoose.connection as any).db = {
      admin: () => ({
        command: vi.fn().mockResolvedValue({ setName: 'rs0' }),
      }),
      collection: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(actorId), role: 'SYSTEM_ADMIN' }),
    } as any);

    vi.spyOn(RoomModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    vi.spyOn(BookingModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomClosureModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    // INJECT FAILURE: RoomClosureModel.create fails
    vi.spyOn(RoomClosureModel, 'create').mockRejectedValueOnce(new Error('Simulated closure insert failure'));

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: closedRoomId, reason: 'Power transformer blown' },
        { actor: { id: actorId, role: 'SYSTEM_ADMIN' } }
      )
    ).rejects.toThrow('Simulated closure insert failure');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
  });

  it('Failure Injection: AuditLog write failure aborts transaction without false success', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    (mongoose.connection as any).db = {
      admin: () => ({
        command: vi.fn().mockResolvedValue({ setName: 'rs0' }),
      }),
      collection: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(actorId), role: 'SYSTEM_ADMIN' }),
    } as any);

    vi.spyOn(RoomModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    vi.spyOn(RoomModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    vi.spyOn(BookingModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomClosureModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'updateOne').mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);
    vi.spyOn(RoomClosureModel, 'create').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as any);

    // INJECT FAILURE: AuditLogModel.create fails
    vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Compliance audit storage failure'));

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: closedRoomId, reason: 'Hazardous spill' },
        { actor: { id: actorId, role: 'SYSTEM_ADMIN' } }
      )
    ).rejects.toThrow('Compliance audit storage failure');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
  });

  it('Stale Record Detection: updateOne with matchedCount 0 throws 409 CONFLICT', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    (mongoose.connection as any).db = {
      admin: () => ({
        command: vi.fn().mockResolvedValue({ setName: 'rs0' }),
      }),
      collection: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(actorId), role: 'SYSTEM_ADMIN' }),
    } as any);

    vi.spyOn(RoomModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    const bookingInClosedRoom = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
      title: 'Stale Class',
      requesterId: new mongoose.Types.ObjectId(actorId),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: new mongoose.Types.ObjectId(closedRoomId),
      createdAt: new Date(),
    };

    vi.spyOn(BookingModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue(bookingInClosedRoom),
    } as any);

    vi.spyOn(RoomModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    vi.spyOn(BookingModel, 'find').mockImplementation((query: any) => {
      if (query?.assignedRoomId) {
        return { lean: vi.fn().mockResolvedValue([]) } as any;
      }
      return { lean: vi.fn().mockResolvedValue([bookingInClosedRoom]) } as any;
    });

    vi.spyOn(RoomModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(closedRoomId),
          code: 'LH-101',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
        {
          _id: new mongoose.Types.ObjectId(destRoomId),
          code: 'LH-102',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
      ]),
    } as any);

    vi.spyOn(RoomClosureModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'updateOne').mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);
    vi.spyOn(RoomClosureModel, 'create').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as any);

    // CONCURRENT UPDATE DETECTED: Booking was deleted or status altered concurrently (matchedCount: 0)
    vi.spyOn(BookingModel, 'updateOne').mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0, acknowledged: true } as any);

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: closedRoomId, reason: 'Ceiling leak' },
        { actor: { id: actorId, role: 'SYSTEM_ADMIN' } }
      )
    ).rejects.toThrow('was not found or was modified concurrently');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
  });

  it('Concurrency Collision: Live occupancy revalidation detects overlapping booking and aborts', async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    };

    vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    (mongoose.connection as any).db = {
      admin: () => ({
        command: vi.fn().mockResolvedValue({ setName: 'rs0' }),
      }),
      collection: vi.fn().mockReturnValue({}),
    };

    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(actorId), role: 'SYSTEM_ADMIN' }),
    } as any);

    vi.spyOn(RoomModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(closedRoomId),
        code: 'LH-101',
        capacity: 60,
        facilities: [],
        building: 'A',
        floor: 1,
        isBlocked: false,
      }),
    } as any);

    const bookingInClosedRoom = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
      title: 'Class A',
      requesterId: new mongoose.Types.ObjectId(actorId),
      requesterRole: 'TUTOR',
      enrollmentCount: 30,
      requiredFacilities: [],
      slot: slotMorning,
      status: 'ALLOCATED',
      assignedRoomId: new mongoose.Types.ObjectId(closedRoomId),
      createdAt: new Date(),
    };

    // Live conflicting booking already placed in destination room by competing recovery
    const conflictingBookingInDest = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      title: 'Class B (Concurrent)',
      assignedRoomId: new mongoose.Types.ObjectId(destRoomId),
      slot: slotMorning,
    };

    vi.spyOn(BookingModel, 'find').mockImplementation((query: any) => {
      if (query?.assignedRoomId) {
        return { lean: vi.fn().mockResolvedValue([conflictingBookingInDest]) } as any;
      }
      return { lean: vi.fn().mockResolvedValue([bookingInClosedRoom]) } as any;
    });

    vi.spyOn(RoomModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(closedRoomId),
          code: 'LH-101',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
        {
          _id: new mongoose.Types.ObjectId(destRoomId),
          code: 'LH-102',
          capacity: 60,
          facilities: [],
          building: 'A',
          floor: 1,
          isBlocked: false,
        },
      ]),
    } as any);

    vi.spyOn(RoomClosureModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(RoomModel, 'updateOne').mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

    await expect(
      recoveryService.handleRoomClosure(
        { roomId: closedRoomId, reason: 'Fire drill' },
        { actor: { id: actorId, role: 'SYSTEM_ADMIN' } }
      )
    ).rejects.toThrow('Concurrency conflict: Room');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
  });
});
