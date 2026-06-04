import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore.js';
import { getCollectionDrafts, saveCollectionDrafts } from '../store/collectionDraftStore.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';

type Props = NativeStackScreenProps<AppStackParamList, 'RecordCollection'>;
type Method = 'cash' | 'tsa' | 'tagora_pool';

export function RecordCollectionScreen({ route, navigation }: Props) {
  const { member, plan } = route.params;
  const tso = useAuthStore((s) => s.tso);

  const [amount, setAmount] = useState(plan ? String(plan.amount) : '');
  const [method, setMethod] = useState<Method>('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAddToSchedule() {
    if (!plan) {
      Alert.alert('No active plan', 'This member has no active savings plan.');
      return;
    }
    if (!tso) {
      setError('Session expired. Please log in again.');
      return;
    }

    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError('Enter a valid whole number amount');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const drafts = await getCollectionDrafts(tso.tsoId);
      const duplicate = drafts.find(
        (draft) =>
          draft.memberId === member.memberId &&
          draft.planId === plan.planId &&
          draft.amount === parsed &&
          draft.method === method,
      );
      if (duplicate) {
        setError('This collection is already in the schedule.');
        return;
      }

      const next = [
        ...drafts,
        {
          id: `${member.memberId}-${Date.now()}`,
          memberId: member.memberId,
          memberName: member.name,
          memberPhone: member.phone,
          accountNumber: member.accountNumber,
          planId: plan.planId,
          amount: parsed,
          method,
        },
      ];

      await saveCollectionDrafts(tso.tsoId, next);

      Alert.alert('Added', `${member.name} added to schedule.`, [
        { text: 'Go to Collections', onPress: () => navigation.navigate('CollectionsHistory') },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to schedule');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>{member.name}</Text>
      <Text style={shared.muted}>{member.phone}</Text>
      {plan ? (
        <Text style={[shared.muted, styles.planInfo]}>
          Plan: {plan.name} - target {plan.amount.toLocaleString()} / {plan.frequency}
        </Text>
      ) : (
        <Text style={[shared.muted, styles.planInfo]}>No active plan</Text>
      )}

      {error ? <Text style={shared.error}>{error}</Text> : null}

      <Text style={[shared.label, styles.mt]}>Amount</Text>
      <TextInput
        style={shared.input}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.muted}
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={shared.label}>Payment method</Text>
      <View style={styles.methodRow}>
        {([
          { value: 'cash' as const, label: 'Cash' },
          { value: 'tsa' as const, label: 'TSA' },
          { value: 'tagora_pool' as const, label: 'Tagora-Pool' },
        ]).map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.methodBtn, method === m.value && styles.methodBtnActive]}
            onPress={() => setMethod(m.value)}
          >
            <Text style={[styles.methodText, method === m.value && styles.methodTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[shared.btn, styles.mt, busy && shared.btnDisabled]}
        onPress={() => void handleAddToSchedule()}
        disabled={busy}
      >
        <Text style={shared.btnText}>{busy ? 'Adding...' : 'Add To Schedule'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  mt: { marginTop: 8 },
  planInfo: { marginTop: 4, marginBottom: 16 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodText: { color: colors.muted, fontWeight: '600' },
  methodTextActive: { color: colors.primary },
});
