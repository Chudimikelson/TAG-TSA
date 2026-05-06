import { Request, Response, NextFunction } from 'express';
import {
  createWithdrawalSchema,
  reviewWithdrawalSchema,
  CreateWithdrawalBody,
  ReviewWithdrawalBody,
} from '../validators/withdrawal.validators.js';
import {
  createWithdrawal,
  getWithdrawal,
  listWithdrawals,
  reviewWithdrawal,
} from '../services/withdrawal.service.js';

export async function handleCreateWithdrawal(
  req: Request<object, object, CreateWithdrawalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createWithdrawalSchema.parse(req.body);
    const withdrawal = await createWithdrawal(body, req.actor!.sub);
    res.status(201).json({ success: true, data: withdrawal });
  } catch (err) {
    next(err);
  }
}

export async function handleListWithdrawals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const withdrawals = await listWithdrawals(req.actor!.sub, req.actor!.role);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    next(err);
  }
}

export async function handleGetWithdrawal(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const withdrawal = await getWithdrawal(
      req.params.id,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json({ success: true, data: withdrawal });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewWithdrawal(
  req: Request<{ id: string }, object, ReviewWithdrawalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = reviewWithdrawalSchema.parse(req.body);
    const withdrawal = await reviewWithdrawal(req.params.id, body, req.actor!.sub);
    res.json({ success: true, data: withdrawal });
  } catch (err) {
    next(err);
  }
}
