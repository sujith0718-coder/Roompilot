import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
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
