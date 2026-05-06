import { Request, Response, NextFunction } from 'express';
import { getTsoAssignments } from '../services/tso.service.js';

export async function handleGetTsoAssignments(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const assignments = await getTsoAssignments(
      req.params.id,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
}
