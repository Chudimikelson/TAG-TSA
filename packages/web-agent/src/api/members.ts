import { request } from './client.js';
import type { Member, SavingsPlan } from '@tagora/shared';

export interface CreateMemberPayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  accountNumber?: string;
  nationalIdRef?: string;
}

export interface UpdateMemberPayload {
  phone?: string;
  address?: string;
  accountNumber?: string;
  nationalIdRef?: string;
}

export interface CreatePlanPayload {
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  startDate: string; // ISO date string
}

export interface UpdatePlanPayload {
  name?: string;
  amount?: number;
  frequency?: 'daily' | 'weekly' | 'monthly';
  startDate?: string; // ISO date string
}

export async function createMember(payload: CreateMemberPayload): Promise<Member> {
  const res = await request<{ success: boolean; data: Member }>('/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMember(memberId: string, payload: UpdateMemberPayload): Promise<Member> {
  const res = await request<{ success: boolean; data: Member }>(`/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function createPlan(
  memberId: string,
  payload: CreatePlanPayload,
): Promise<SavingsPlan> {
  const res = await request<{ success: boolean; data: SavingsPlan }>(
    `/members/${memberId}/plans`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function getMemberPlans(memberId: string): Promise<SavingsPlan[]> {
  const res = await request<{ success: boolean; data: SavingsPlan[] }>(`/members/${memberId}/plans`);
  return res.data;
}

export async function updatePlan(
  memberId: string,
  planId: string,
  payload: UpdatePlanPayload,
): Promise<SavingsPlan> {
  const res = await request<{ success: boolean; data: SavingsPlan }>(
    `/members/${memberId}/plans/${planId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
