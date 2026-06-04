import * as SecureStore from 'expo-secure-store';

export type DraftCollection = {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  accountNumber?: string;
  planId: string;
  amount: number;
  method: 'cash' | 'tsa' | 'tagora_pool';
};

function keyFor(tsoId: string): string {
  return `tagora:collection-drafts:${tsoId}`;
}

export async function getCollectionDrafts(tsoId: string): Promise<DraftCollection[]> {
  const raw = await SecureStore.getItemAsync(keyFor(tsoId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is DraftCollection => (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.memberId === 'string' &&
      typeof item.memberName === 'string' &&
      typeof item.planId === 'string' &&
      typeof item.amount === 'number' &&
      (item.method === 'cash' || item.method === 'tsa' || item.method === 'tagora_pool')
    ));
  } catch {
    return [];
  }
}

export async function saveCollectionDrafts(tsoId: string, drafts: DraftCollection[]): Promise<void> {
  if (drafts.length === 0) {
    await SecureStore.deleteItemAsync(keyFor(tsoId));
    return;
  }

  await SecureStore.setItemAsync(keyFor(tsoId), JSON.stringify(drafts));
}
