import { request, saveToken } from './client.js';

export interface TsoProfile {
  tsoId: string;
  name: string;
  phone: string;
}

export interface LoginResult {
  token: string;
  tso: TsoProfile;
}

export async function login(phone: string, password: string): Promise<LoginResult> {
  const res = await request<{ success: boolean; data: LoginResult }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  saveToken(res.data.token);
  return res.data;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<LoginResult> {
  const res = await request<{ success: boolean; data: LoginResult }>(
    '/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    },
  );
  saveToken(res.data.token);
  return res.data;
}
