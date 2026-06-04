import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createWithdrawal, type CreateWithdrawalPayload } from '../api/withdrawals.js';
import { getAssignments, type Assignment } from '../api/collections.js';
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

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<DisbursementMethod>('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tso) {
      setAssignmentLoading(false);
      return;
    }

    getAssignments(tso.tsoId)
      .then((res) => setAssignments(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setAssignmentLoading(false));
  }, [tso]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAssignments = useMemo(() => {
    if (!normalizedSearch) return [];
    return assignments.filter(({ member }) => {
      const account = (member.accountNumber ?? '').toLowerCase();
      const name = member.name.toLowerCase();
      return account.includes(normalizedSearch) || name.includes(normalizedSearch);
    });
  }, [assignments, normalizedSearch]);

  const matchedAssignment = selectedMemberId
    ? assignments.find(({ member }) => member.memberId === selectedMemberId)
    : filteredAssignments.length === 1
      ? filteredAssignments[0]
      : undefined;

  const matchedMember = matchedAssignment?.member;
  const matchedPlan = matchedAssignment?.activePlan;

  async function handleSubmit() {
    const parsed = parseFloat(amount);
    if (!normalizedSearch || !parsed || parsed <= 0) {
      setError('Provide customer search and a valid amount.');
      return;
    }

    if (!matchedAssignment || !matchedMember) {
      setError('No thrift saver found for this search.');
      return;
    }

    if (!matchedPlan) {
      setError('Selected thrift saver has no active plan.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await createWithdrawal({
        memberId: matchedMember.memberId,
        planId: matchedPlan.planId,
        amount: parsed,
        disbursementMethod,
      });

      Alert.alert('Submitted', 'Withdrawal request submitted.', [
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

      <Text style={shared.label}>Search Customer</Text>
      <TextInput
        style={shared.input}
        placeholder="Search by customer name"
        placeholderTextColor={colors.muted}
        value={searchTerm}
        onChangeText={(text) => {
          setSearchTerm(text);
          setSelectedMemberId('');
        }}
      />

      {assignmentLoading ? (
        <View style={{ marginBottom: 12 }}>
          <TagoraLoader compact />
        </View>
      ) : null}

      {!assignmentLoading && normalizedSearch && filteredAssignments.length === 0 ? (
        <Text style={shared.error}>No thrift saver found for this search.</Text>
      ) : null}

      {!assignmentLoading && filteredAssignments.length > 1 && !matchedMember ? (
        <View style={[shared.card, { marginBottom: 12 }]}> 
          <Text style={[shared.label, { marginBottom: 8 }]}>Select Thrift Saver</Text>
          {filteredAssignments.slice(0, 8).map(({ member }) => (
            <TouchableOpacity
              key={member.memberId}
              style={styles.selectBtn}
              onPress={() => setSelectedMemberId(member.memberId)}
            >
              <Text style={styles.selectBtnText}>{member.name} - {member.accountNumber ?? member.memberId}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {!assignmentLoading && matchedMember ? (
        <View style={[shared.card, { marginBottom: 12 }]}> 
          <Text style={styles.selectedName}>{matchedMember.name}</Text>
          <Text style={shared.muted}>Account: {matchedMember.accountNumber}</Text>
          <Text style={shared.muted}>Account Balance: ₦{Number(matchedMember.savingsBalance ?? 0).toLocaleString()}</Text>
        </View>
      ) : null}

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
            style={[styles.methodBtn, disbursementMethod === m.value && styles.methodBtnActive]}
            onPress={() => setDisbursementMethod(m.value)}
          >
            <Text style={[styles.methodText, disbursementMethod === m.value && styles.methodTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[shared.btn, styles.mt, (busy || assignmentLoading) && shared.btnDisabled]}
        onPress={() => void handleSubmit()}
        disabled={busy || assignmentLoading}
      >
        <Text style={shared.btnText}>{busy ? 'Submitting...' : 'Submit Request'}</Text>
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
  selectBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  selectBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  selectedName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
});
