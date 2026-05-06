import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose model methods before importing the service
vi.mock('../models/Otp.js', () => ({
  OtpModel: {
    deleteMany: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    findOne: vi.fn(),
  },
}));

import { generateOtp, verifyOtp } from '../services/otp.service.js';
import { OtpModel } from '../models/Otp.js';

describe('otp.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('generateOtp', () => {
    it('deletes existing OTPs for the phone before creating a new one', async () => {
      await generateOtp('+2348000000001');
      expect(OtpModel.deleteMany).toHaveBeenCalledWith({
        phone: '+2348000000001',
        verified: false,
      });
      expect(OtpModel.create).toHaveBeenCalledOnce();
    });

    it('returns a 6-digit numeric string', async () => {
      const code = await generateOtp('+2348000000002');
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    it('returns false when no matching record exists', async () => {
      vi.mocked(OtpModel.findOne).mockResolvedValueOnce(null);
      const result = await verifyOtp('+2348000000003', '123456');
      expect(result).toBe(false);
    });

    it('returns false when code does not match', async () => {
      vi.mocked(OtpModel.findOne).mockResolvedValueOnce({
        code: '999999',
        verified: false,
        save: vi.fn(),
      } as never);
      const result = await verifyOtp('+2348000000004', '123456');
      expect(result).toBe(false);
    });

    it('returns true and marks verified when code matches', async () => {
      const save = vi.fn().mockResolvedValue({});
      vi.mocked(OtpModel.findOne).mockResolvedValueOnce({
        code: '123456',
        verified: false,
        save,
      } as never);
      const result = await verifyOtp('+2348000000005', '123456');
      expect(result).toBe(true);
      expect(save).toHaveBeenCalledOnce();
    });
  });
});
