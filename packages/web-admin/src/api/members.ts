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

export function getMembers(): Promise<MemberListResponse> {
  return request<MemberListResponse>('/members');
}

export function getMemberPlans(memberId: string): Promise<PlanListResponse> {
  return request<PlanListResponse>(`/members/${memberId}/plans`);
}
