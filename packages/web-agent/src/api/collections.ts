import type { Member, SavingsPlan, Collection } from '@tagora/shared';
import { request, uploadForm } from './client.js';

export interface Assignment {
  member: Member;
  activePlan: SavingsPlan | null;
}

export async function getAssignments(tsoId: string): Promise<Assignment[]> {
  const res = await request<{ success: boolean; data: Assignment[] }>(
    `/tso/${tsoId}/assignments`,
  );
  return res.data;
}

export interface CreateCollectionPayload {
  planId: string;
  memberId: string;
  amount: number;
  method: 'cash' | 'tsa' | 'tagora_pool';
  idempotencyKey: string;
  lat?: number;
  lng?: number;
  photoFile?: File;
}

export async function createCollection(
  payload: CreateCollectionPayload,
): Promise<void> {
  const { photoFile, lat, lng, ...rest } = payload;
  if (photoFile) {
    const form = new FormData();
    Object.entries(rest).forEach(([k, v]) => form.append(k, String(v)));
    if (lat !== undefined) form.append('lat', String(lat));
    if (lng !== undefined) form.append('lng', String(lng));
    form.append('receipt', photoFile);
    await uploadForm('/collections', form);
  } else {
    await request('/collections', {
      method: 'POST',
      body: JSON.stringify({ ...rest, lat, lng }),
    });
  }
}

export async function getCollections(): Promise<Collection[]> {
  const res = await request<{ success: boolean; data: Collection[] }>(
    '/collections',
  );
  return res.data;
}
