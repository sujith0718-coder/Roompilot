import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { RoomModel, RoomClosureModel, AuditLogModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiSuccess, Room } from '../../../shared/types/index.js';

function toRoomDTO(doc: any): Room {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    capacity: doc.capacity,
    facilities: doc.facilities,
    building: doc.building,
    floor: doc.floor,
    isBlocked: doc.isBlocked,
    blockReason: doc.blockReason,
  };
}

export const getRooms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { building, floor, minCapacity, isBlocked, facility } = req.query;
    const filter: Record<string, unknown> = {};

    if (building) {
      filter.building = String(building);
    }
    if (floor !== undefined) {
      filter.floor = Number(floor);
    }
    if (minCapacity !== undefined) {
      filter.capacity = { $gte: Number(minCapacity) };
    }
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked === 'true';
    }
    if (facility) {
      filter.facilities = String(facility);
    }

    const docs = await RoomModel.find(filter).sort({ building: 1, floor: 1, code: 1 });
    const rooms = docs.map(toRoomDTO);

    const response: ApiSuccess<Room[]> = {
      success: true,
      data: rooms,
      message: `Retrieved ${rooms.length} room(s)`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

export const getRoomById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    let doc = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      doc = await RoomModel.findById(id);
    }
    if (!doc) {
      doc = await RoomModel.findOne({ code: id.toUpperCase() });
    }

    if (!doc) {
      throw new AppError(404, 'ROOM_NOT_FOUND', `Room '${id}' does not exist`);
    }

    const response: ApiSuccess<Room> = {
      success: true,
      data: toRoomDTO(doc),
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, name, capacity, facilities, building, floor, isBlocked, blockReason } =
      req.body;

    const existing = await RoomModel.findOne({ code: code.toUpperCase() });
    if (existing) {
      throw new AppError(409, 'ROOM_CODE_EXISTS', `Room with code '${code}' already exists`);
    }

    const newRoom = await RoomModel.create({
      code: code.toUpperCase(),
      name,
      capacity,
      facilities,
      building,
      floor,
      isBlocked: Boolean(isBlocked),
      blockReason: blockReason || undefined,
    });

    if (req.user) {
      await AuditLogModel.create({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'CREATE_ROOM',
        resource: `Room:${newRoom._id}`,
        details: { code: newRoom.code, capacity: newRoom.capacity },
      });
    }

    const response: ApiSuccess<Room> = {
      success: true,
      data: toRoomDTO(newRoom),
      message: `Room '${newRoom.code}' successfully created`,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const blockRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isBlocked, reason } = req.body;

    let doc = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      doc = await RoomModel.findById(id);
    }
    if (!doc) {
      doc = await RoomModel.findOne({ code: id.toUpperCase() });
    }

    if (!doc) {
      throw new AppError(404, 'ROOM_NOT_FOUND', `Room '${id}' does not exist`);
    }

    doc.isBlocked = isBlocked;
    doc.blockReason = isBlocked ? (reason || 'Closed for maintenance') : undefined;
    await doc.save();

    if (isBlocked) {
      await RoomClosureModel.create({
        roomId: doc._id,
        reason: reason || 'Closed for maintenance',
        closedBy: req.user?.id,
        status: 'ACTIVE',
      });
    } else {
      await RoomClosureModel.updateMany(
        { roomId: doc._id, status: 'ACTIVE' },
        { status: 'RESOLVED', resolvedAt: new Date() }
      );
    }

    if (req.user) {
      await AuditLogModel.create({
        userId: req.user.id,
        userRole: req.user.role,
        action: isBlocked ? 'BLOCK_ROOM' : 'UNBLOCK_ROOM',
        resource: `Room:${doc._id}`,
        details: { code: doc.code, reason: doc.blockReason },
      });
    }

    const response: ApiSuccess<Room> = {
      success: true,
      data: toRoomDTO(doc),
      message: `Room '${doc.code}' status updated to ${isBlocked ? 'BLOCKED' : 'AVAILABLE'}`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
