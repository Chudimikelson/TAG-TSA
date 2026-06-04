import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Collection } from '@tagora/shared';
import { createCollection, getCollections } from '../api/collections.js';
import { getCollectionDrafts, saveCollectionDrafts, type DraftCollection } from '../store/collectionDraftStore.js';
import { useAuthStore } from '../store/authStore.js';
import { shared, colors } from '../theme.js';
import { TagoraLoader } from '../components/TagoraLoader.js';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warningLight,
  confirmed: colors.primaryLight,
  matched: colors.primaryLight,
  flagged: colors.dangerLight,
  rejected: colors.dangerLight,
  reconciled: '#f3f4f6',
};

function methodLabel(method: Collection['method']): string {
  if (method === 'cash') return 'Cash';
  if (method === 'tsa') return 'Transfer (TSA)';
  return 'Transfer (Tagora-Pool)';
}

export function CollectionsHistoryScreen() {
  const tso = useAuthStore((s) => s.tso);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [drafts, setDrafts] = useState<DraftCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [collectionsRes, queued] = await Promise.all([
        getCollections(),
        tso ? getCollectionDrafts(tso.tsoId) : Promise.resolve([]),
      ]);
      setCollections(collectionsRes.data);
      setDrafts(queued);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    }
  }, [tso]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleRemoveDraft(id: string) {
    if (!tso) return;
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    await saveCollectionDrafts(tso.tsoId, next);
  }

  async function handleSubmitSchedule() {
    if (!tso) {
      setError('Session expired. Please log in again.');
      return;
    }

    if (drafts.length === 0) {
      setError('No scheduled collections to submit.');
      return;
    }

    setSubmitLoading(true);
    setError('');
    setNotice('');

    try {
      for (const draft of drafts) {
        await createCollection({
          memberId: draft.memberId,
          planId: draft.planId,
          amount: draft.amount,
          method: draft.method,
          idempotencyKey: `${draft.memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }

      await saveCollectionDrafts(tso.tsoId, []);
      setDrafts([]);
      setNotice(`${drafts.length} scheduled collection${drafts.length === 1 ? '' : 's'} submitted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit schedule');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return <TagoraLoader fullScreen />;
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Collections</Text>
      {notice ? <Text style={shared.success}>{notice}</Text> : null}
      {error ? <Text style={shared.error}>{error}</Text> : null}

      {drafts.length > 0 ? (
        <View style={[shared.card, { marginBottom: 12 }]}> 
          <View style={shared.row}>
            <Text style={styles.sectionTitle}>Scheduled Collections</Text>
            <Text style={shared.muted}>{drafts.length} item{drafts.length === 1 ? '' : 's'}</Text>
          </View>

          {drafts.map((draft) => (
            <View key={draft.id} style={styles.draftRow}>
              <View>
                <Text style={styles.draftName}>{draft.memberName}</Text>
                <Text style={shared.muted}>{draft.memberPhone ?? draft.accountNumber ?? draft.memberId}</Text>
              </View>
              <View style={styles.draftRight}>
                <Text style={styles.draftAmount}>₦{draft.amount.toLocaleString()}</Text>
                <TouchableOpacity onPress={() => void handleRemoveDraft(draft.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[shared.btn, submitLoading && shared.btnDisabled]}
            onPress={() => void handleSubmitSchedule()}
            disabled={submitLoading}
          >
            <Text style={shared.btnText}>{submitLoading ? 'Submitting...' : 'Submit Schedule'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={collections}
        keyExtractor={(item) => item.collectionId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={shared.muted}>No collections recorded yet.</Text>}
        renderItem={({ item }) => (
          <View style={shared.card}>
            <View style={shared.row}>
              <Text style={styles.amount}>₦{item.amount.toLocaleString()}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] ?? '#f3f4f6' }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={shared.muted}>{new Date(item.timestamp).toLocaleString()} · {methodLabel(item.method)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 2,
  },
  draftRight: { alignItems: 'flex-end', gap: 4 },
  draftName: { fontWeight: '600', color: colors.text },
  draftAmount: { fontWeight: '700', color: colors.primary },
  removeText: { color: colors.danger, fontWeight: '600' },
});
