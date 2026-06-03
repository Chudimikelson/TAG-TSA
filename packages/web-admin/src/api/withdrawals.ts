import type { WithdrawalRequest } from '@tagora/shared';
import { request } from './client.js';

export interface WithdrawalListResponse {
  success: boolean;
  data: WithdrawalRequest[];
}

export function getWithdrawals(): Promise<WithdrawalListResponse> {
  return request<WithdrawalListResponse>('/withdrawals');
}
