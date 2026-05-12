import { request } from './client.js';

export interface TsoItem {
  tsoId: string;
  name: string;
  email?: string;
  phone: string;
  deviceId: string;
  assignedAreas: string[];
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface TsoListResponse {
  success: boolean;
  data: TsoItem[];
}

export interface CreateTsoInput {
  name: string;
  email?: string;
  phone: string;
  password: string;
  deviceId: string;
  assignedAreas: string[];
}

export function getTsos(): Promise<TsoListResponse> {
  return request<TsoListResponse>('/admin/tsos');
}

export function createTso(input: CreateTsoInput): Promise<{ success: boolean; data: TsoItem }> {
  return request<{ success: boolean; data: TsoItem }>('/admin/tsos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTsoStatus(
  tsoId: string,
  status: 'active' | 'suspended',
): Promise<{ success: boolean; data: TsoItem }> {
  return request<{ success: boolean; data: TsoItem }>(`/admin/tsos/${tsoId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateTso(
  tsoId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: 'active' | 'suspended';
  },
): Promise<{ success: boolean; data: TsoItem }> {
  return request<{ success: boolean; data: TsoItem }>(`/admin/tsos/${tsoId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
