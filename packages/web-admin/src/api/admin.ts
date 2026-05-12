import { request } from './client.js';

export interface AdminUser {
  adminId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: Date;
}

export async function createAdmin(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}): Promise<AdminUser> {
  const res = await request<{ success: boolean; data: AdminUser }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function listAdmins(): Promise<AdminUser[]> {
  const res = await request<{ success: boolean; data: AdminUser[] }>('/admin/users', {
    method: 'GET',
  });
  return res.data;
}

export async function getAdmin(adminId: string): Promise<AdminUser> {
  const res = await request<{ success: boolean; data: AdminUser }>(
    `/admin/users/${adminId}`,
    { method: 'GET' },
  );
  return res.data;
}

export async function updateAdminRole(
  adminId: string,
  role: string,
): Promise<AdminUser> {
  const res = await request<{ success: boolean; data: AdminUser }>(
    `/admin/users/${adminId}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
  return res.data;
}

export async function updateAdminStatus(
  adminId: string,
  status: string,
): Promise<AdminUser> {
  const res = await request<{ success: boolean; data: AdminUser }>(
    `/admin/users/${adminId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
  return res.data;
}

export async function updateAdmin(
  adminId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
    status?: string;
  },
): Promise<AdminUser> {
  const res = await request<{ success: boolean; data: AdminUser }>(
    `/admin/users/${adminId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  return res.data;
}
