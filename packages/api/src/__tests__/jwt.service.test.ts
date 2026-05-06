import { describe, it, expect } from 'vitest';

// JWT_SECRET must be set before importing the service
process.env.JWT_SECRET = 'test_secret_32_chars_minimum_here';

import { signToken, verifyToken } from '../services/jwt.service.js';

describe('jwt.service', () => {
  it('signs and verifies a valid token', () => {
    const token = signToken({ sub: 'tso-123', role: 'tso', deviceId: 'device-abc' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('tso-123');
    expect(payload.role).toBe('tso');
    expect(payload.deviceId).toBe('device-abc');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ sub: 'tso-123', role: 'tso' });
    expect(() => verifyToken(token + 'tampered')).toThrow();
  });
});
