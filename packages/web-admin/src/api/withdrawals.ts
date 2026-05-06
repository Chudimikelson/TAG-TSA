import type { WithdrawalRequest } from '@tagora/shared';
import { request } from './client.js';

export interface WithdrawalListResponse {
  success: boolean;
  data: WithdrawalRequest[];
}

export function getWithdrawals(): Promise<WithdrawalListResponse> {
  return request<WithdrawalListResponse>('/withdrawals');
}

export function approveWithdrawal(withdrawalId: string): Promise<unknown> {
  return request(`/withdrawals/${withdrawalId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision: 'approved' }),
  });
}

export function rejectWithdrawal(withdrawalId: string): Promise<unknown> {
  return request(`/withdrawals/${withdrawalId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision: 'rejected' }),
  });
}
