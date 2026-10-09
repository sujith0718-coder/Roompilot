import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import roomRoutes from './roomRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import validationRoutes from './validationRoutes.js';
import allocationRoutes from './allocationRoutes.js';
import authRoutes from './authRoutes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/validation', validationRoutes);
apiRouter.use('/allocation', allocationRoutes);

export default apiRouter;
