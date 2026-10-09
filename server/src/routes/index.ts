import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);

export default apiRouter;
