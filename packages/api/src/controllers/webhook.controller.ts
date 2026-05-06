import { Request, Response, NextFunction } from 'express';
import { processPaymentWebhook } from '../services/webhook.service.js';

export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawBody = req.body as Buffer;
    const signature = req.headers['x-payment-signature'] as string | undefined;

    const result = await processPaymentWebhook(rawBody, signature);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
