import { request, setToken } from './client.js';

export interface LoginResponse {
  token: string;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await request<{ success: boolean; data: LoginResponse }>(
    '/auth/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
  setToken(res.data.token);
}
