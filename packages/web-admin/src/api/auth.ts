import { request, setToken } from './client.js';

export interface LoginResponse {
  token: string;
}

export async function login(identifier: string, password: string): Promise<void> {
  const res = await request<{ success: boolean; data: LoginResponse }>(
    '/auth/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    },
  );
  setToken(res.data.token);
}
