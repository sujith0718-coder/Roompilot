import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import recoveryRoutes from './recoveryRoutes.js';
import metricsRoutes from './metricsRoutes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/recovery', recoveryRoutes);
apiRouter.use('/metrics', metricsRoutes);

export default apiRouter;
