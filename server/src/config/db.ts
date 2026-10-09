import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async (): Promise<typeof mongoose | null> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning: ${(error as Error).message}`);
    console.warn('Backend server running with database disconnected.');
    return null;
  }
};
