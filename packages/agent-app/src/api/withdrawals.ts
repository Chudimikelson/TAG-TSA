import type { WithdrawalRequest } from '@tagora/shared';
import { request } from './client.js';

export interface CreateWithdrawalPayload {
  planId: string;
  memberId: string;
  amount: number;
  disbursementMethod: 'bank_transfer' | 'cash' | 'mobile_money';
}

export function createWithdrawal(
  payload: CreateWithdrawalPayload,
): Promise<{ success: boolean; data: WithdrawalRequest }> {
  return request('/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getWithdrawals(): Promise<{ success: boolean; data: WithdrawalRequest[] }> {
  return request('/withdrawals');
}
