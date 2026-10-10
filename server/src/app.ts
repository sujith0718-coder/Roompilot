import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://roompilot-omega.vercel.app',
];

const envOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// API Routes
app.use('/api/v1', apiRouter);

// 404 Handler
app.use((_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Requested API endpoint does not exist'));
});

// Central Error Handler
app.use(errorHandler);

export default app;
