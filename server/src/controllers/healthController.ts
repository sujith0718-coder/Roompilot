import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiSuccess } from '../../../shared/types/index.js';

export const getHealth = (_req: Request, res: Response): void => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING',
  };

  const response: ApiSuccess<{ status: string; dbStatus: string; uptime: number }> = {
    success: true,
    data: {
      status: 'UP',
      dbStatus: dbStatusMap[dbState] || 'UNKNOWN',
      uptime: process.uptime(),
    },
    message: 'RoomWise Backend Service Operational',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
};
