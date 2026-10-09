import { Router } from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import {
  createBookingSchema,
  updateBookingStatusSchema,
} from '../middleware/validationSchemas.js';

const router = Router();

// GET /api/v1/bookings - list booking requests (scoped by user role)
router.get('/', authenticate, getBookings);

// GET /api/v1/bookings/:id - get single booking request
router.get('/:id', authenticate, getBookingById);

// POST /api/v1/bookings - request booking/class occurrence (authorized requestor roles)
router.post(
  '/',
  authenticate,
  authorizeRoles(
    'TUTOR',
    'STUDENT_REP',
    'EVENT_MANAGER',
    'SECRETARY',
    'HOD',
    'COE',
    'SYSTEM_ADMIN'
  ),
  validateBody(createBookingSchema),
  createBooking
);

// PATCH /api/v1/bookings/:id/status - approve or reject booking (approver roles)
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('SECRETARY', 'HOD', 'COE', 'PRINCIPAL', 'SYSTEM_ADMIN'),
  validateBody(updateBookingStatusSchema),
  updateBookingStatus
);

export default router;
