import { Router } from 'express';
import { closeRoomAndRecover } from '../controllers/recoveryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// POST /api/v1/recovery/close-room
router.post(
  '/close-room',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'PRINCIPAL'),
  closeRoomAndRecover
);

export default router;
