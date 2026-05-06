import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { receiptUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { createCollectionSchema } from '../validators/collection.validators.js';
import { handleCreateCollection, handleGetCollection, handleListCollections } from '../controllers/collection.controller.js';

export const collectionRouter = Router();

// All collection routes require authentication
collectionRouter.use(requireAuth);

// POST /collections — TSO only
collectionRouter.post(
  '/',
  requireRole('tso'),
  receiptUpload,
  validate(createCollectionSchema),
  handleCreateCollection,
);

// GET /collections — TSO (own) or admin
collectionRouter.get('/', requireRole('tso', 'admin'), handleListCollections);

// GET /collections/:id — TSO (own) or admin
collectionRouter.get(
  '/:id',
  requireRole('tso', 'admin'),
  handleGetCollection,
);
