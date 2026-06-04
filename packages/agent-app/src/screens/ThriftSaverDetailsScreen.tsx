import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { Member, SavingsPlan } from '@tagora/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAssignments, getCollections, type Assignment } from '../api/collections.js';
import { getWithdrawals } from '../api/withdrawals.js';
import { useAuthStore } from '../store/authStore.js';
import { shared, colors } from '../theme.js';
import type { AppStackParamList } from '../navigation/types.js';
import { TagoraLoader } from '../components/TagoraLoader.js';

type Props = NativeStackScreenProps<AppStackParamList, 'ThriftSaverDetails'>;

type StatementEntry = {
  id: string;
  timestamp: Date;
  type: 'collection' | 'withdrawal';
  method: string;
  status: string;
  amount: number;
};

function methodLabel(value: string): string {
  if (value === 'tsa') return 'Transfer (TSA)';
  if (value === 'tagora_pool') return 'Transfer (Tagora-Pool)';
  if (value === 'bank_transfer') return 'Bank Transfer';
  if (value === 'mobile_money') return 'Mobile Money';
  if (value === 'cash') return 'Cash';
  return value.replace('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function affectsBalance(entry: StatementEntry): boolean {
  if (entry.type === 'collection') {
    return entry.status === 'confirmed' || entry.status === 'matched' || entry.status === 'reconciled';
  }

  return entry.status === 'approved' || entry.status === 'disbursed';
}

function statusColor(status: string): string {
  if (status === 'confirmed' || status === 'approved' || status === 'disbursed' || status === 'matched') {
    return colors.primaryLight;
  }
  if (status === 'pending') return colors.warningLight;
  return colors.dangerLight;
}

export function ThriftSaverDetailsScreen({ route, navigation }: Props) {
  const tso = useAuthStore((s) => s.tso);
  const { memberId, member: routeMember, plan: routePlan } = route.params;

  const [assignment, setAssignment] = useState<Assignment | null>(
    routeMember ? { member: routeMember, activePlan: routePlan ?? null } : null,
  );
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        let selected: Assignment | null = null;

        if (routeMember && routeMember.memberId === memberId) {
          selected = { member: routeMember, activePlan: routePlan ?? null };
        } else {
          if (!tso) {
            throw new Error('Unable to load thrift saver details.');
          }
          const assignmentsRes = await getAssignments(tso.tsoId);
          selected = assignmentsRes.data.find((item) => item.member.memberId === memberId) ?? null;
        }

        if (!active) return;
        setAssignment(selected);

        if (!selected) {
          setEntries([]);
          return;
        }

        const [collectionsRes, withdrawalsRes] = await Promise.all([
          getCollections(),
          getWithdrawals(),
        ]);

        if (!active) return;

        const memberCollections: StatementEntry[] = collectionsRes.data
          .filter((item) => item.memberId === selected?.member.memberId)
          .map((item) => ({
            id: item.collectionId,
            timestamp: new Date(item.timestamp),
            type: 'collection',
            method: methodLabel(item.method),
            status: item.status,
            amount: Number(item.amount) || 0,
          }));

        const memberWithdrawals: StatementEntry[] = withdrawalsRes.data
          .filter((item) => item.memberId === selected?.member.memberId)
          .map((item) => ({
            id: item.withdrawalId,
            timestamp: new Date(item.requestedAt),
            type: 'withdrawal',
            method: methodLabel(item.disbursementMethod),
            status: item.status,
            amount: Number(item.amount) || 0,
          }));

        setEntries(
          [...memberCollections, ...memberWithdrawals]
            .filter((item) => item.status !== 'rejected')
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load thrift saver details.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [memberId, routeMember, routePlan, tso]);

  const member = assignment?.member;
  const activePlan: SavingsPlan | null = assignment?.activePlan ?? null;

  const summary = useMemo(() => {
    let totalCollections = 0;
    let totalWithdrawals = 0;

    entries.forEach((entry) => {
      if (entry.type === 'collection') {
        totalCollections += entry.amount;
      } else {
        totalWithdrawals += entry.amount;
      }
    });

    return {
      totalCollections,
      totalWithdrawals,
      movementCount: entries.length,
    };
  }, [entries]);

  const statementRows = useMemo(() => {
    let running = Number(member?.savingsBalance ?? 0);

    return entries.map((entry) => {
      const balanceAtEntry = running;
      if (affectsBalance(entry)) {
        if (entry.type === 'collection') {
          running -= entry.amount;
        } else {
          running += entry.amount;
        }
      }

      return {
        ...entry,
        balanceAtEntry,
      };
    });
  }, [entries, member?.savingsBalance]);

  if (loading) {
    return <TagoraLoader fullScreen />;
  }

  if (error) {
    return (
      <View style={shared.screen}>
        <Text style={shared.title}>Thrift Saver Details</Text>
        <Text style={shared.error}>{error}</Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={shared.screen}>
        <Text style={shared.title}>Thrift Saver Details</Text>
        <Text style={shared.muted}>Thrift saver not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>{member.name}</Text>

      <View style={shared.card}>
        <Text style={shared.label}>Member ID</Text>
        <Text style={styles.valueText}>{member.memberId}</Text>
        <Text style={[shared.label, styles.topSpace]}>Account Number</Text>
        <Text style={styles.valueText}>{member.accountNumber ?? 'N/A'}</Text>
      </View>

      <View style={shared.card}>
        <Text style={shared.label}>Contact Details</Text>
        <Text style={shared.muted}>Phone: {member.phone ?? 'N/A'}</Text>
        <Text style={shared.muted}>Email: {member.email ?? 'N/A'}</Text>
        <Text style={shared.muted}>Address: {member.address ?? 'N/A'}</Text>
      </View>

      <View style={shared.card}>
        <Text style={shared.label}>Savings Snapshot</Text>
        <Text style={styles.balance}>₦{Number(member.savingsBalance ?? 0).toLocaleString()}</Text>
        {activePlan ? (
          <Text style={shared.muted}>
            Active Plan: {activePlan.name} - ₦{activePlan.amount.toLocaleString()} / {activePlan.frequency}
          </Text>
        ) : (
          <Text style={shared.muted}>No active plan</Text>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[shared.btn, styles.actionBtn]}
            onPress={() =>
              navigation.navigate('RecordCollection', {
                member,
                plan: activePlan ?? undefined,
              })
            }
          >
            <Text style={shared.btnText}>Record Collection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, styles.actionBtn]}
            onPress={() => navigation.navigate('NewWithdrawal')}
          >
            <Text style={styles.secondaryBtnText}>Request Withdrawal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={shared.card}>
        <View style={shared.row}>
          <Text style={styles.sectionTitle}>Account Statement</Text>
          <Text style={shared.muted}>{summary.movementCount} entries</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.creditText}>Collections: ₦{summary.totalCollections.toLocaleString()}</Text>
          <Text style={styles.debitText}>Withdrawals: ₦{summary.totalWithdrawals.toLocaleString()}</Text>
        </View>

        {statementRows.length === 0 ? (
          <Text style={shared.muted}>No statement entries yet.</Text>
        ) : (
          statementRows.map((entry) => (
            <View key={`${entry.type}-${entry.id}`} style={styles.statementRow}>
              <View style={styles.statementTop}>
                <Text style={styles.dateText}>{entry.timestamp.toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(entry.status) }]}>
                  <Text style={styles.statusText}>{entry.status}</Text>
                </View>
              </View>
              <Text style={shared.muted}>{entry.method}</Text>
              <View style={styles.valueRow}>
                <Text style={styles.debitText}>Debit: {entry.type === 'withdrawal' ? `₦${entry.amount.toLocaleString()}` : '-'}</Text>
                <Text style={styles.creditText}>Credit: {entry.type === 'collection' ? `₦${entry.amount.toLocaleString()}` : '-'}</Text>
              </View>
              <Text style={styles.balanceRow}>Balance: ₦{entry.balanceAtEntry.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  topSpace: { marginTop: 10 },
  valueText: { color: colors.text, fontWeight: '600' },
  balance: { fontSize: 26, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  statementRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  statementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 12, color: colors.muted },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: colors.text },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  debitText: { color: colors.danger, fontWeight: '600' },
  creditText: { color: colors.primary, fontWeight: '600' },
  balanceRow: { color: colors.text, fontWeight: '700', marginTop: 6 },
});
