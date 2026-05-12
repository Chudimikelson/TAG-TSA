import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
	handleCreateTso,
	handleFlagCollection,
	handleListTsos,
	handleUpdateTso,
	handleUpdateTsoStatus,
	handleCreateAdmin,
	handleListAdmins,
	handleGetAdmin,
	handleUpdateAdmin,
	handleUpdateAdminRole,
	handleUpdateAdminStatus,
} from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import {
	createTsoByAdminSchema,
	createAdminSchema,
	updateAdminSchema,
	updateAdminRoleSchema,
	updateAdminStatusSchema,
	updateTsoSchema,
	updateTsoStatusSchema,
} from '../validators/admin.validators.js';
import { AppError } from '../middleware/errorHandler.js';

export const adminRouter = Router();

// Middleware to ensure SuperAdmin role
function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.actor || req.actor.adminRole !== 'SuperAdmin') {
    return next(new AppError(403, 'This action requires SuperAdmin privileges'));
  }
  next();
}

adminRouter.use(requireAuth, requireRole('admin'));

// GET /admin/tsos
adminRouter.get('/tsos', handleListTsos);

// POST /admin/tsos
adminRouter.post('/tsos', validate(createTsoByAdminSchema), handleCreateTso);

// PATCH /admin/tsos/:id/status - Update TSO status (active/suspended)
adminRouter.patch('/tsos/:id/status', requireSuperAdmin, validate(updateTsoStatusSchema), handleUpdateTsoStatus);

// PATCH /admin/tsos/:id - Update TSO details
adminRouter.patch('/tsos/:id', requireSuperAdmin, validate(updateTsoSchema), handleUpdateTso);

// POST /admin/collections/:id/flag
adminRouter.post('/collections/:id/flag', handleFlagCollection);

// Admin management endpoints (SuperAdmin only)
// POST /admin/users - Create new admin
adminRouter.post('/users', requireSuperAdmin, validate(createAdminSchema), handleCreateAdmin);

// GET /admin/users - List all admins
adminRouter.get('/users', requireSuperAdmin, handleListAdmins);

// GET /admin/users/:id - Get admin by id
adminRouter.get('/users/:id', requireSuperAdmin, handleGetAdmin);

// PATCH /admin/users/:id - Update admin details
adminRouter.patch('/users/:id', requireSuperAdmin, validate(updateAdminSchema), handleUpdateAdmin);

// PATCH /admin/users/:id/role - Update admin role
adminRouter.patch('/users/:id/role', requireSuperAdmin, validate(updateAdminRoleSchema), handleUpdateAdminRole);

// PATCH /admin/users/:id/status - Update admin status (active/suspended)
adminRouter.patch('/users/:id/status', requireSuperAdmin, validate(updateAdminStatusSchema), handleUpdateAdminStatus);
