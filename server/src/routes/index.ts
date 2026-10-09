import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import roomRoutes from './roomRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import validationRoutes from './validationRoutes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/validation', validationRoutes);

export default apiRouter;
