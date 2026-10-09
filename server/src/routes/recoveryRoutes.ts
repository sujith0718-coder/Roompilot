import { Router } from 'express';
import { reassignDisruptionHandler } from '../controllers/recoveryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { reassignDisruptionSchema } from '../middleware/validationSchemas.js';

const router = Router();

// POST /api/v1/recovery/reassign - trigger room closure disruption recovery
router.post(
  '/reassign',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'PRINCIPAL', 'COE', 'EVENT_MANAGER', 'SECRETARY'),
  validateBody(reassignDisruptionSchema),
  reassignDisruptionHandler
);

export default router;
