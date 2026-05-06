import { MemberModel } from '../models/Member.js';
import { generateOtp, verifyOtp } from './otp.service.js';
import { signToken } from './jwt.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Request OTP for customer login
// ---------------------------------------------------------------------------

export async function customerRequestOtp(phone: string): Promise<{ message: string }> {
  const member = await MemberModel.findOne({ phone });
  if (!member) {
    throw new AppError(404, 'No account found for this phone number');
  }

  const code = await generateOtp(phone);

  if (process.env.NODE_ENV !== 'production') {
    logger.warn(`[DEV] Customer OTP for ${phone}: ${code}`);
  }
  // TODO: dispatch via SMS in production

  return { message: 'OTP sent' };
}

// ---------------------------------------------------------------------------
// Verify OTP and return JWT
// ---------------------------------------------------------------------------

export async function customerVerifyOtp(
  phone: string,
  code: string,
): Promise<{ token: string }> {
  const member = await MemberModel.findOne({ phone });
  if (!member) {
    throw new AppError(404, 'No account found for this phone number');
  }

  const valid = await verifyOtp(phone, code);
  if (!valid) {
    throw new AppError(401, 'Invalid or expired OTP');
  }

  const token = signToken({ sub: member.memberId, role: 'customer' });
  return { token };
}
