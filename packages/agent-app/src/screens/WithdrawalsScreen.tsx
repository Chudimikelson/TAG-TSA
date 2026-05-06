import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import type { WithdrawalRequest } from '@tagora/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getWithdrawals } from '../api/withdrawals.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';

type Props = NativeStackScreenProps<AppStackParamList, 'Withdrawals'>;

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warningLight,
  approved: colors.primaryLight,
  rejected: colors.dangerLight,
  disbursed: '#f3f4f6',
};

export function WithdrawalsScreen({ navigation }: Props) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getWithdrawals();
      setWithdrawals(res.data);
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
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <View style={shared.row}>
        <Text style={shared.title}>Withdrawals</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('NewWithdrawal')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={shared.error}>{error}</Text> : null}
      <FlatList
        data={withdrawals}
        keyExtractor={(item) => item.withdrawalId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={shared.muted}>No withdrawal requests yet.</Text>
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
              {new Date(item.requestedAt).toLocaleDateString()} ·{' '}
              {item.disbursementMethod.replace('_', ' ')}
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
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  newBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
