import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createWithdrawalSchema } from '../validators/withdrawal.validators.js';
import {
  handleCreateWithdrawal,
  handleGetWithdrawal,
  handleListWithdrawals,
} from '../controllers/withdrawal.controller.js';

export const withdrawalRouter = Router();

withdrawalRouter.use(requireAuth);

// POST /withdrawals — TSO only
withdrawalRouter.post(
  '/',
  requireRole('tso'),
  validate(createWithdrawalSchema),
  handleCreateWithdrawal,
);

// GET /withdrawals — TSO (own) or admin
withdrawalRouter.get('/', requireRole('tso', 'admin'), handleListWithdrawals);

// GET /withdrawals/:id — TSO (own) or admin
withdrawalRouter.get('/:id', requireRole('tso', 'admin'), handleGetWithdrawal);

