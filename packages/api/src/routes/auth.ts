import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate.js';
import {
  registerTsoSchema,
  loginSchema,
  verifyOtpSchema,
  adminLoginSchema,
} from '../validators/auth.validators.js';
import {
  customerRequestOtpSchema,
  customerVerifyOtpSchema,
} from '../validators/customer.validators.js';
import {
  handleRegisterTso,
  handleLogin,
  handleVerifyOtp,
} from '../controllers/auth.controller.js';
import {
  handleCustomerRequestOtp,
  handleCustomerVerifyOtp,
} from '../controllers/customer.controller.js';
import { loginAdmin } from '../services/auth.service.js';

export const authRouter = Router();

// POST /auth/register/tso
authRouter.post('/register/tso', validate(registerTsoSchema), handleRegisterTso);

// POST /auth/login  (TSO)
authRouter.post('/login', validate(loginSchema), handleLogin);

// POST /auth/verify-otp
authRouter.post('/verify-otp', validate(verifyOtpSchema), handleVerifyOtp);

// POST /auth/admin/login  (back-office admins — email/phone + password, no OTP)
authRouter.post(
  '/admin/login',
  validate(adminLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body as { identifier: string; password: string };
      const result = await loginAdmin(identifier, password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/customer/request-otp
authRouter.post(
  '/customer/request-otp',
  validate(customerRequestOtpSchema),
  handleCustomerRequestOtp,
);

// POST /auth/customer/verify-otp
authRouter.post(
  '/customer/verify-otp',
  validate(customerVerifyOtpSchema),
  handleCustomerVerifyOtp,
);
