import { Router } from 'express';
import { runAllocationHandler } from '../controllers/allocationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { runAllocationSchema } from '../middleware/validationSchemas.js';

const router = Router();

// POST /api/v1/allocation/run - execute allocation algorithm (FIRST_FIT or HEURISTIC)
router.post(
  '/run',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'PRINCIPAL', 'COE', 'EVENT_MANAGER'),
  validateBody(runAllocationSchema),
  runAllocationHandler
);

export default router;
