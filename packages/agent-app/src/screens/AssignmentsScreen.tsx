import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAssignments, type Assignment } from '../api/collections.js';
import { useAuthStore } from '../store/authStore.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';
import { TagoraLoader } from '../components/TagoraLoader.js';

type Props = NativeStackScreenProps<AppStackParamList, 'Assignments'>;

export function AssignmentsScreen({ navigation }: Props) {
  const tso = useAuthStore((s) => s.tso);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tso) return;
    getAssignments(tso.tsoId)
      .then((res) => setAssignments(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tso]);

  if (loading) {
    return <TagoraLoader fullScreen />;
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Thrift Savers</Text>
      {error ? <Text style={shared.error}>{error}</Text> : null}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.member.memberId}
        ListEmptyComponent={
          <Text style={shared.muted}>No assigned members yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={shared.card}
            onPress={() =>
              navigation.navigate('ThriftSaverDetails', {
                memberId: item.member.memberId,
                member: item.member,
                plan: item.activePlan ?? undefined,
              })
            }
          >
            <View style={shared.row}>
              <Text style={styles.name}>{item.member.name}</Text>
              <Text style={shared.muted}>{item.member.phone}</Text>
            </View>
            <Text style={shared.muted}>
              Balance: NGN {(item.member.savingsBalance ?? 0).toLocaleString()}
            </Text>
            {item.activePlan ? (
              <Text style={shared.muted}>
                Plan: {item.activePlan.name} — {item.activePlan.amount.toLocaleString()} /{' '}
                {item.activePlan.frequency}
              </Text>
            ) : (
              <Text style={shared.muted}>No active plan</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
});
