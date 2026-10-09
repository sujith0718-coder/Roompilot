import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/roomwise'),
  JWT_SECRET: z.string().default('development_jwt_secret_change_in_prod'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  TIMEZONE: z.string().default('Asia/Kolkata'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
