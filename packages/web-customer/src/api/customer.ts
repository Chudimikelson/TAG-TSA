import type { Collection, Member, SavingsPlan, WithdrawalRequest } from '@tagora/shared';
import { request } from './client.js';

export interface MeResponse {
  member: Member;
  plans: SavingsPlan[];
}

export function getMe(): Promise<{ success: boolean; data: MeResponse }> {
  return request('/customer/me');
}

export function getCollections(): Promise<{ success: boolean; data: Collection[] }> {
  return request('/customer/collections');
}

export function getWithdrawals(): Promise<{ success: boolean; data: WithdrawalRequest[] }> {
  return request('/customer/withdrawals');
}
