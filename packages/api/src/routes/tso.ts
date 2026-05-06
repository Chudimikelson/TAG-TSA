import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleGetTsoAssignments } from '../controllers/tso.controller.js';

export const tsoRouter = Router();

tsoRouter.use(requireAuth);

// GET /tso/:id/assignments  (TSO = own only; admin = any)
tsoRouter.get('/:id/assignments', requireRole('tso', 'admin'), handleGetTsoAssignments);
