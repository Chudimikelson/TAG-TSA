import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMemberSchema,
  createPlanSchema,
  updateMemberSchema,
  updatePlanSchema,
} from '../validators/member.validators.js';
import {
  handleListMembers,
  handleCreateMember,
  handleGetMember,
  handleCreatePlan,
  handleGetMemberPlans,
  handleUpdateMember,
  handleUpdateMemberPlan,
} from '../controllers/member.controller.js';

export const memberRouter = Router();

// All member routes require authentication
memberRouter.use(requireAuth);

// GET /members — admin or tso
memberRouter.get('/', requireRole('admin', 'tso'), handleListMembers);

// POST /members — admin or tso
memberRouter.post('/', requireRole('admin', 'tso'), validate(createMemberSchema), handleCreateMember);

// GET /members/:id — admin or tso
memberRouter.get('/:id', requireRole('admin', 'tso'), handleGetMember);

// PATCH /members/:id — admin or tso
memberRouter.patch(
  '/:id',
  requireRole('admin', 'tso'),
  validate(updateMemberSchema),
  handleUpdateMember,
);

// POST /members/:id/plans — admin or tso
memberRouter.post(
  '/:id/plans',
  requireRole('admin', 'tso'),
  validate(createPlanSchema),
  handleCreatePlan,
);

// GET /members/:id/plans — admin or tso
memberRouter.get('/:id/plans', requireRole('admin', 'tso'), handleGetMemberPlans);

// PATCH /members/:id/plans/:planId — admin or tso
memberRouter.patch(
  '/:id/plans/:planId',
  requireRole('admin', 'tso'),
  validate(updatePlanSchema),
  handleUpdateMemberPlan,
);
