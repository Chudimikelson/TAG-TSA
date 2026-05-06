import { request, setToken } from './client.js';

export async function requestOtp(phone: string): Promise<void> {
  await request('/auth/customer/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const res = await request<{ success: boolean; data: { token: string } }>(
    '/auth/customer/verify-otp',
    { method: 'POST', body: JSON.stringify({ phone, code }) },
  );
  setToken(res.data.token);
}
