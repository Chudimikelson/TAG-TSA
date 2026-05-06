import type { WithdrawalRequest } from '@tagora/shared';
import { request } from './client.js';

export interface CreateWithdrawalPayload {
  memberId: string;
  planId: string;
  amount: number;
  disbursementMethod: 'cash' | 'bank_transfer' | 'mobile_money';
}

export async function getWithdrawals(): Promise<WithdrawalRequest[]> {
  const res = await request<{ success: boolean; data: WithdrawalRequest[] }>(
    '/withdrawals',
  );
  return res.data;
}

export async function createWithdrawal(
  payload: CreateWithdrawalPayload,
): Promise<void> {
  await request('/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
