import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
	handleCreateTso,
	handleFlagCollection,
	handleListTsos,
} from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { createTsoByAdminSchema } from '../validators/admin.validators.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

// GET /admin/tsos
adminRouter.get('/tsos', handleListTsos);

// POST /admin/tsos
adminRouter.post('/tsos', validate(createTsoByAdminSchema), handleCreateTso);

// POST /admin/collections/:id/flag
adminRouter.post('/collections/:id/flag', handleFlagCollection);
