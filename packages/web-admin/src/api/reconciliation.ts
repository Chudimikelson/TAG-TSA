import type { Transaction } from '@tagora/shared';
import { request } from './client.js';

export interface UnmatchedResponse {
  success: boolean;
  data: Transaction[];
}

export function getUnmatchedTransactions(): Promise<UnmatchedResponse> {
  return request<UnmatchedResponse>('/reconciliation/transactions/unmatched');
}

export function manualMatch(
  transactionId: string,
  collectionId: string,
): Promise<unknown> {
  return request(`/reconciliation/transactions/${transactionId}/match`, {
    method: 'POST',
    body: JSON.stringify({ collectionId }),
  });
}

export interface ReconciliationInput {
  date: string;
  expectedTotal: number;
  cashCounted: number;
  transfersTotal: number;
  notes?: string;
}

export function createReconciliation(input: ReconciliationInput): Promise<unknown> {
  return request('/reconciliation', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function downloadCollectionsCsv(): Promise<string> {
  return request<string>('/reconciliation/reports/collections.csv');
}
