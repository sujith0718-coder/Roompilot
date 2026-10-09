import { Router } from 'express';
import {
  getRooms,
  getRoomById,
  createRoom,
  blockRoom,
} from '../controllers/roomController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import {
  createRoomSchema,
  blockRoomSchema,
} from '../middleware/validationSchemas.js';

const router = Router();

// GET /api/v1/rooms - view room list and availability (all authenticated roles)
router.get('/', authenticate, getRooms);

// GET /api/v1/rooms/:id - view single room details (all authenticated roles)
router.get('/:id', authenticate, getRoomById);

// POST /api/v1/rooms - create new room (SYSTEM_ADMIN only)
router.post(
  '/',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN'),
  validateBody(createRoomSchema),
  createRoom
);

// PATCH /api/v1/rooms/:id/block - toggle room closure/blocked status (SYSTEM_ADMIN, HOD, PRINCIPAL)
router.patch(
  '/:id/block',
  authenticate,
  authorizeRoles('SYSTEM_ADMIN', 'HOD', 'PRINCIPAL'),
  validateBody(blockRoomSchema),
  blockRoom
);

export default router;
