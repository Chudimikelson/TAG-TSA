import crypto from 'crypto';
import { OtpModel } from '../models/Otp.js';

const OTP_TTL_SECONDS = 300; // 5 minutes

/**
 * Generates a 6-digit OTP, persists it, and returns the code.
 * In production the caller should dispatch the code via SMS.
 */
export async function generateOtp(phone: string): Promise<string> {
  // Invalidate any existing pending OTPs for this phone
  await OtpModel.deleteMany({ phone, verified: false });

  const code = crypto.randomInt(100_000, 999_999).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await OtpModel.create({ phone, code, expiresAt, verified: false });

  return code;
}

/**
 * Verifies the OTP for a phone number.
 * Marks the record as verified on success.
 * Returns true if valid, false otherwise.
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const record = await OtpModel.findOne({
    phone,
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record || record.code !== code) {
    return false;
  }

  record.verified = true;
  await record.save();
  return true;
}
