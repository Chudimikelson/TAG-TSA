import { Request, Response, NextFunction } from 'express';
import {
  registerTsoSchema,
  loginSchema,
  verifyOtpSchema,
  RegisterTsoBody,
  LoginBody,
  VerifyOtpBody,
} from '../validators/auth.validators.js';
import { registerTso, loginTso, verifyTsoOtp } from '../services/auth.service.js';

export async function handleRegisterTso(
  req: Request<object, object, RegisterTsoBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = registerTsoSchema.parse(req.body);
    const result = await registerTso(body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: Request<object, object, LoginBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginTso(body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyOtp(
  req: Request<object, object, VerifyOtpBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = verifyOtpSchema.parse(req.body);
    const result = await verifyTsoOtp(body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
