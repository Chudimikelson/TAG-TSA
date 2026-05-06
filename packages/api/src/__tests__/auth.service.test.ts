import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.JWT_SECRET = 'test_secret_32_chars_minimum_here';
process.env.NODE_ENV = 'test';

vi.mock('../models/Tso.js', () => ({
  TsoModel: {
    findOne: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../models/Otp.js', () => ({
  OtpModel: {
    deleteMany: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    findOne: vi.fn(),
  },
}));

import { registerTso, loginTso, verifyTsoOtp } from '../services/auth.service.js';
import { TsoModel } from '../models/Tso.js';
import { OtpModel } from '../models/Otp.js';
import { AppError } from '../middleware/errorHandler.js';

describe('auth.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // -------------------------------------------------------------------------
  // registerTso
  // -------------------------------------------------------------------------
  describe('registerTso', () => {
    it('throws 409 if phone already registered', async () => {
      vi.mocked(TsoModel.findOne).mockResolvedValueOnce({ tsoId: 'existing' } as never);
      await expect(
        registerTso({ name: 'Ada', phone: '+2348000000001', password: 'secret123', deviceId: 'dev1' }),
      ).rejects.toThrow(AppError);
    });

    it('creates TSO and returns success message for new phone', async () => {
      vi.mocked(TsoModel.findOne).mockResolvedValueOnce(null);
      const result = await registerTso({
        name: 'Ada',
        phone: '+2348000000002',
        password: 'secret123',
        deviceId: 'dev1',
      });
      expect(TsoModel.create).toHaveBeenCalledOnce();
      expect(result.message).toContain('Registration successful');
    });
  });

  // -------------------------------------------------------------------------
  // loginTso
  // -------------------------------------------------------------------------
  describe('loginTso', () => {
    it('throws 401 when TSO not found', async () => {
      vi.mocked(TsoModel.findOne).mockResolvedValueOnce(null);
      await expect(
        loginTso({ phone: '+2348000000003', password: 'secret123', deviceId: 'dev1' }),
      ).rejects.toThrow(AppError);
    });

    it('throws 403 when device does not match', async () => {
      // Create a valid passwordHash via the same hashing path
      const crypto = await import('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync('secret123', salt, 310_000, 32, 'sha256').toString('hex');
      const passwordHash = `${salt}:${hash}`;

      vi.mocked(TsoModel.findOne).mockResolvedValueOnce({
        tsoId: 'tso-1',
        passwordHash,
        status: 'active',
        deviceId: 'other-device',
      } as never);

      await expect(
        loginTso({ phone: '+2348000000004', password: 'secret123', deviceId: 'dev1' }),
      ).rejects.toThrow(AppError);
    });

    it('returns token and tso profile on valid credentials', async () => {
      const crypto = await import('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync('secret123', salt, 310_000, 32, 'sha256').toString('hex');
      const passwordHash = `${salt}:${hash}`;

      vi.mocked(TsoModel.findOne).mockResolvedValueOnce({
        tsoId: 'tso-1',
        name: 'Test TSO',
        phone: '+2348000000005',
        passwordHash,
        status: 'active',
        deviceId: 'dev1',
      } as never);

      const result = await loginTso({ phone: '+2348000000005', password: 'secret123', deviceId: 'dev1' });
      expect(result.token).toBeDefined();
      expect(result.tso.tsoId).toBe('tso-1');
    });
  });

  // -------------------------------------------------------------------------
  // verifyTsoOtp
  // -------------------------------------------------------------------------
  describe('verifyTsoOtp', () => {
    it('throws 400 on invalid OTP', async () => {
      vi.mocked(OtpModel.findOne).mockResolvedValueOnce(null);
      await expect(
        verifyTsoOtp({ phone: '+2348000000006', code: '000000' }),
      ).rejects.toThrow(AppError);
    });

    it('returns success message on valid OTP', async () => {
      const save = vi.fn().mockResolvedValue({});
      vi.mocked(OtpModel.findOne).mockResolvedValueOnce({ code: '123456', verified: false, save } as never);
      vi.mocked(OtpModel.deleteMany).mockResolvedValueOnce({} as never);
      const result = await verifyTsoOtp({ phone: '+2348000000007', code: '123456' });
      expect(result.message).toContain('verified');
    });
  });
});
