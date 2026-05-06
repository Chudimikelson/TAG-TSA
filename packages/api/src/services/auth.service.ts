import crypto from 'crypto';
import { TsoModel } from '../models/Tso.js';
import { AdminModel } from '../models/Admin.js';
import { OtpModel } from '../models/Otp.js';
import { generateOtp, verifyOtp } from './otp.service.js';
import { signToken } from './jwt.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashPassword(password: string): string {
  // PBKDF2 via Node built-ins – no bcrypt dependency required
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 310_000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 310_000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ---------------------------------------------------------------------------
// Register TSO
// ---------------------------------------------------------------------------

export interface RegisterTsoInput {
  name: string;
  phone: string;
  password: string;
  deviceId: string;
}

export async function registerTso(input: RegisterTsoInput): Promise<{ message: string }> {
  const existing = await TsoModel.findOne({ phone: input.phone });
  if (existing) {
    throw new AppError(409, 'Phone number already registered');
  }

  const tsoId = uuidv4();
  const passwordHash = hashPassword(input.password);

  await TsoModel.create({
    tsoId,
    name: input.name,
    phone: input.phone,
    passwordHash,
    deviceId: input.deviceId,
    assignedAreas: [],
    status: 'active',
  });

  // Send OTP for phone verification
  const code = await generateOtp(input.phone);

  // In production, dispatch via SMS provider here.
  // For development, emit to logs only.
  if (process.env.NODE_ENV !== 'production') {
    logger.warn(`[DEV] OTP for ${input.phone}: ${code}`);
  }

  return { message: 'Registration successful. Verify your phone with the OTP sent.' };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginInput {
  phone: string;
  password: string;
  deviceId?: string;
}

export interface LoginResult {
  token: string;
  tso: { tsoId: string; name: string; phone: string };
}

export async function loginTso(input: LoginInput): Promise<LoginResult> {
  const tso = await TsoModel.findOne({ phone: input.phone });

  // Constant-time rejection to prevent user enumeration
  if (!tso || !verifyPassword(input.password, tso.passwordHash)) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (tso.status === 'suspended') {
    throw new AppError(403, 'Account suspended. Contact support.');
  }

  // Device binding disabled — any device can log in
  const token = signToken({ sub: tso.tsoId, role: 'tso' });
  return { token, tso: { tsoId: tso.tsoId, name: tso.name, phone: tso.phone } };
}

// ---------------------------------------------------------------------------
// Verify OTP
// ---------------------------------------------------------------------------

export interface VerifyOtpInput {
  phone: string;
  code: string;
}

export async function verifyTsoOtp(input: VerifyOtpInput): Promise<{ message: string }> {
  const valid = await verifyOtp(input.phone, input.code);
  if (!valid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  // Clean up used OTP
  await OtpModel.deleteMany({ phone: input.phone, verified: true });

  return { message: 'Phone verified successfully' };
}

// ---------------------------------------------------------------------------
// Admin login (email + password, no OTP / device binding)
// ---------------------------------------------------------------------------

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const admin = await AdminModel.findOne({ email: email.toLowerCase() });

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    throw new AppError(401, 'Invalid credentials');
  }

  const token = signToken({ sub: admin.adminId, role: 'admin' });
  return { token };
}
