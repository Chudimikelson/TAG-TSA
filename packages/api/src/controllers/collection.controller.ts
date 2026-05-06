import { Request, Response, NextFunction } from 'express';
import { createCollectionSchema, CreateCollectionBody } from '../validators/collection.validators.js';
import { createCollection, getCollection, listCollections } from '../services/collection.service.js';

export async function handleCreateCollection(
  req: Request<object, object, CreateCollectionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createCollectionSchema.parse(req.body);
    const tsoId = req.actor!.sub;

    const collection = await createCollection({
      ...body,
      tsoId,
      receiptFile: req.file,
    });

    // 200 on idempotent replay, 201 on first creation
    const alreadyExisted = collection.createdAt < new Date(Date.now() - 500);
    res.status(alreadyExisted ? 200 : 201).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCollection(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collection = await getCollection(
      req.params.id,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function handleListCollections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const collections = await listCollections(req.actor!.sub, req.actor!.role);
    res.json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
}
