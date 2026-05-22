import type { Member, SavingsPlan } from '@tagora/shared';
import { request } from './client.js';

export interface MemberListResponse {
  success: boolean;
  data: Member[];
}

export interface PlanListResponse {
  success: boolean;
  data: SavingsPlan[];
}

export interface UpdateMemberInput {
  phone?: string;
  address?: string;
  accountNumber?: string;
  nationalIdRef?: string;
  createdByTsoId?: string;
}

export function getMembers(): Promise<MemberListResponse> {
  return request<MemberListResponse>('/members');
}

export function getMemberPlans(memberId: string): Promise<PlanListResponse> {
  return request<PlanListResponse>(`/members/${memberId}/plans`);
}

export function updateMember(memberId: string, input: UpdateMemberInput): Promise<{ success: boolean; data: Member }> {
  return request<{ success: boolean; data: Member }>(`/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export interface BalanceUpdateRow {
  accountNumber: string;
  balance: number;
}

export interface BalanceUpdateResult {
  accountNumber: string;
  status: 'updated' | 'not_found' | 'invalid';
  name?: string;
  previousBalance?: number;
}

export function bulkUpdateDepositBalances(
  updates: BalanceUpdateRow[],
): Promise<{ success: boolean; data: BalanceUpdateResult[] }> {
  return request<{ success: boolean; data: BalanceUpdateResult[] }>('/admin/members/bulk-balance', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}
