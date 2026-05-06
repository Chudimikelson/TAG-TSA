import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  handleCreateReconciliation,
  handleExportCollectionsCsv,
  handleGetUnmatchedTransactions,
  handleManualMatch,
} from '../controllers/reconciliation.controller.js';
import {
  createReconciliationSchema,
  manualMatchSchema,
} from '../validators/reconciliation.validators.js';

export const reconciliationRouter = Router();

reconciliationRouter.use(requireAuth, requireRole('admin'));

// POST /reconciliation
reconciliationRouter.post(
  '/',
  validate(createReconciliationSchema),
  handleCreateReconciliation,
);

// GET /reports/collections.csv
reconciliationRouter.get('/reports/collections.csv', handleExportCollectionsCsv);

// GET /transactions/unmatched
reconciliationRouter.get('/transactions/unmatched', handleGetUnmatchedTransactions);

// POST /transactions/:id/match
reconciliationRouter.post(
  '/transactions/:id/match',
  validate(manualMatchSchema),
  handleManualMatch,
);
