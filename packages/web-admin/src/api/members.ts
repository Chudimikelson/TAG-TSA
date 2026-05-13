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
