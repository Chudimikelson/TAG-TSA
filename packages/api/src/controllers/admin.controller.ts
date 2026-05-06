import { Request, Response, NextFunction } from 'express';
import {
  createTsoByAdmin,
  flagCollection,
  listTsos,
} from '../services/admin.service.js';

export async function handleFlagCollection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const collection = await flagCollection(req.params.id, req.actor!.sub);
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateTso(req: Request, res: Response, next: NextFunction) {
  try {
    const tso = await createTsoByAdmin(req.body, req.actor!.sub);
    res.status(201).json({ success: true, data: tso });
  } catch (err) {
    next(err);
  }
}

export async function handleListTsos(_req: Request, res: Response, next: NextFunction) {
  try {
    const tsos = await listTsos();
    res.json({ success: true, data: tsos });
  } catch (err) {
    next(err);
  }
}
