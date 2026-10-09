import { Router } from 'express';
import { validateProposedAllocation } from '../controllers/validationController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { validateAllocationSchema } from '../middleware/validationSchemas.js';

const router = Router();

// POST /api/v1/validation/validate - run independent hard-constraint checks on proposed assignments
router.post(
  '/validate',
  authenticate,
  validateBody(validateAllocationSchema),
  validateProposedAllocation
);

export default router;
