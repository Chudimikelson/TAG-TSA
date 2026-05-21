import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { Collection } from '@tagora/shared';
import { getCollections } from '../api/collections.js';
import { shared, colors } from '../theme.js';
import { TagoraLoader } from '../components/TagoraLoader.js';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warningLight,
  matched: colors.primaryLight,
  flagged: colors.dangerLight,
  reconciled: '#f3f4f6',
};

export function CollectionsHistoryScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getCollections();
      setCollections(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return <TagoraLoader fullScreen />;
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Collections</Text>
      {error ? <Text style={shared.error}>{error}</Text> : null}
      <FlatList
        data={collections}
        keyExtractor={(item) => item.collectionId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={shared.muted}>No collections recorded yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={shared.card}>
            <View style={shared.row}>
              <Text style={styles.amount}>{item.amount.toLocaleString()}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_COLOR[item.status] ?? '#f3f4f6' },
                ]}
              >
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={shared.muted}>
              {new Date(item.timestamp).toLocaleString()} · {item.method}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
});
