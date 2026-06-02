import type { Collection } from '@tagora/shared';
import { request } from './client.js';

export interface CollectionListResponse {
  success: boolean;
  data: Collection[];
}

export function getCollections(): Promise<CollectionListResponse> {
  return request<CollectionListResponse>('/collections');
}

export function confirmCollection(collectionId: string): Promise<unknown> {
  return request(`/admin/collections/${collectionId}/confirm`, { method: 'POST' });
}

export interface BulkConfirmCollectionsResult {
  requestedCount: number;
  processedCount: number;
  decision: 'confirmed' | 'rejected';
  skipped: Array<{ collectionId: string; reason: 'not_found' | 'not_pending' | 'member_not_found' }>;
}

export function confirmCollectionsBulk(collectionIds: string[]): Promise<{ success: boolean; data: BulkConfirmCollectionsResult }> {
  return request('/admin/collections/confirm-bulk', {
    method: 'POST',
    body: JSON.stringify({ collectionIds }),
  });
}

export function rejectCollectionsBulk(collectionIds: string[]): Promise<{ success: boolean; data: BulkConfirmCollectionsResult }> {
  return request('/admin/collections/reject-bulk', {
    method: 'POST',
    body: JSON.stringify({ collectionIds }),
  });
}

export function rejectCollection(collectionId: string): Promise<unknown> {
  return request(`/admin/collections/${collectionId}/reject`, { method: 'POST' });
}
