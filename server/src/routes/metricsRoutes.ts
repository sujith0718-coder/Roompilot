import { Router } from 'express';
import { compareMetrics } from '../controllers/metricsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// GET & POST /api/v1/metrics/compare
router.get(
  '/compare',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'COE', 'PRINCIPAL'),
  compareMetrics
);

router.post(
  '/compare',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'COE', 'PRINCIPAL'),
  compareMetrics
);

export default router;
