import type { Collection, Member, SavingsPlan } from '@tagora/shared';
import { request, uploadForm } from './client.js';

export interface Assignment {
  member: Member;
  activePlan: SavingsPlan | null;
}

export function getAssignments(
  tsoId: string,
): Promise<{ success: boolean; data: Assignment[] }> {
  return request(`/tso/${tsoId}/assignments`);
}

export interface CreateCollectionPayload {
  planId: string;
  memberId: string;
  amount: number;
  method: 'cash' | 'tsa' | 'tagora_pool';
  idempotencyKey: string;
  lat?: number;
  lng?: number;
  photoUri?: string;
  photoMime?: string;
}

export async function createCollection(
  payload: CreateCollectionPayload,
): Promise<{ success: boolean; data: Collection }> {
  if (payload.photoUri) {
    const form = new FormData();
    form.append('planId', payload.planId);
    form.append('memberId', payload.memberId);
    form.append('amount', String(payload.amount));
    form.append('method', payload.method);
    form.append('idempotencyKey', payload.idempotencyKey);
    if (payload.lat != null) form.append('lat', String(payload.lat));
    if (payload.lng != null) form.append('lng', String(payload.lng));
    // React Native FormData accepts uri/name/type for files
    form.append('receipt', {
      uri: payload.photoUri,
      name: 'receipt.jpg',
      type: payload.photoMime ?? 'image/jpeg',
    } as unknown as Blob);
    return uploadForm('/collections', form) as Promise<{
      success: boolean;
      data: Collection;
    }>;
  }

  return request('/collections', {
    method: 'POST',
    body: JSON.stringify({
      planId: payload.planId,
      memberId: payload.memberId,
      amount: payload.amount,
      method: payload.method,
      idempotencyKey: payload.idempotencyKey,
      lat: payload.lat,
      lng: payload.lng,
    }),
  });
}

export function getCollections(): Promise<{ success: boolean; data: Collection[] }> {
  return request('/collections');
}
