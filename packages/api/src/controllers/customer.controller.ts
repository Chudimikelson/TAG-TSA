import { Request, Response, NextFunction } from 'express';
import { customerRequestOtp, customerVerifyOtp } from '../services/customer.service.js';

export async function handleCustomerRequestOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await customerRequestOtp(req.body.phone as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleCustomerVerifyOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await customerVerifyOtp(
      req.body.phone as string,
      req.body.code as string,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
