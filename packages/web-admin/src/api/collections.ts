import type { Collection } from '@tagora/shared';
import { request } from './client.js';

export interface CollectionListResponse {
  success: boolean;
  data: Collection[];
}

export function getCollections(): Promise<CollectionListResponse> {
  return request<CollectionListResponse>('/collections');
}

export function flagCollection(collectionId: string): Promise<unknown> {
  return request(`/admin/collections/${collectionId}/flag`, { method: 'POST' });
}
