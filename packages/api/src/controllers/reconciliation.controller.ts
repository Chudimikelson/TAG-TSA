import { Request, Response, NextFunction } from 'express';
import {
  createReconciliation,
  exportCollectionsCsv,
  getUnmatchedTransactions,
  manuallyMatchTransaction,
} from '../services/reconciliation.service.js';

export async function handleCreateReconciliation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const record = await createReconciliation(req.body, req.actor!.sub);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function handleGetUnmatchedTransactions(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const transactions = await getUnmatchedTransactions();
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}

export async function handleManualMatch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await manuallyMatchTransaction(
      req.params.id,
      req.body,
      req.actor!.sub,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleExportCollectionsCsv(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const csv = await exportCollectionsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="collections.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
