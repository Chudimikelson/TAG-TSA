import { request, saveToken } from './client.js';

interface LoginResponse {
  success: boolean;
  data: { message: string; phone: string };
}

interface OtpResponse {
  success: boolean;
  data: { token: string; tso: { tsoId: string; name: string; phone: string } };
}

export async function login(phone: string, password: string): Promise<LoginResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<OtpResponse> {
  const res = await request<OtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  await saveToken(res.data.token);
  return res;
}
