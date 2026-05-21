import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createWithdrawal, type CreateWithdrawalPayload } from '../api/withdrawals.js';
import { useAuthStore } from '../store/authStore.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';
import { TagoraLoader } from '../components/TagoraLoader.js';

type Props = NativeStackScreenProps<AppStackParamList, 'NewWithdrawal'>;
type DisbursementMethod = CreateWithdrawalPayload['disbursementMethod'];

const METHODS: { value: DisbursementMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export function NewWithdrawalScreen({ navigation }: Props) {
  const tso = useAuthStore((s) => s.tso);
  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [disbursementMethod, setDisbursementMethod] =
    useState<DisbursementMethod>('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!memberId.trim() || !planId.trim() || !parsed || parsed <= 0) {
      setError('Fill in all fields with valid values.');
      return;
    }
    if (!tso) return;

    setError('');
    setBusy(true);
    try {
      await createWithdrawal({ planId, memberId, amount: parsed, disbursementMethod });
      Alert.alert('Submitted', 'Withdrawal request submitted for review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>New Withdrawal Request</Text>

      {error ? <Text style={shared.error}>{error}</Text> : null}

      <Text style={shared.label}>Member ID</Text>
      <TextInput
        style={shared.input}
        placeholder="MEM-…"
        placeholderTextColor={colors.muted}
        value={memberId}
        onChangeText={setMemberId}
        autoCapitalize="none"
      />

      <Text style={shared.label}>Plan ID</Text>
      <TextInput
        style={shared.input}
        placeholder="PLN-…"
        placeholderTextColor={colors.muted}
        value={planId}
        onChangeText={setPlanId}
        autoCapitalize="none"
      />

      <Text style={shared.label}>Amount</Text>
      <TextInput
        style={shared.input}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.muted}
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={shared.label}>Disbursement method</Text>
      <View style={styles.methods}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[
              styles.methodBtn,
              disbursementMethod === m.value && styles.methodBtnActive,
            ]}
            onPress={() => setDisbursementMethod(m.value)}
          >
            <Text
              style={[
                styles.methodText,
                disbursementMethod === m.value && styles.methodTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[shared.btn, styles.mt, busy && shared.btnDisabled]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy ? <TagoraLoader compact /> : <Text style={shared.btnText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  mt: { marginTop: 8 },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  methodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  methodTextActive: { color: colors.primary },
});
