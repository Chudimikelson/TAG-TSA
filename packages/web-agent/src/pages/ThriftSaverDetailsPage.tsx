import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { Member, SavingsPlan } from '@tagora/shared';
import { Layout } from '../components/Layout.js';
import { getAssignments, getCollections, type Assignment } from '../api/collections.js';
import { getWithdrawals } from '../api/withdrawals.js';
import { useAuth } from '../context/AuthContext.js';

interface LocationState {
  member?: Member;
  activePlan?: SavingsPlan | null;
}

type StatementEntry = {
  id: string;
  timestamp: Date;
  type: 'collection' | 'withdrawal';
  method: string;
  status: string;
  amount: number;
};

function affectsBalance(entry: StatementEntry): boolean {
  if (entry.type === 'collection') {
    return entry.status === 'confirmed' || entry.status === 'matched' || entry.status === 'reconciled';
  }

  return entry.status === 'approved' || entry.status === 'disbursed';
}

function methodLabel(value: string): string {
  if (value === 'tsa') return 'Transfer (TSA)';
  if (value === 'tagora_pool') return 'Transfer (Tagora-Pool)';
  if (value === 'bank_transfer') return 'Bank Transfer';
  if (value === 'mobile_money') return 'Mobile Money';
  return value.replace('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function ThriftSaverDetailsPage() {
  const { tso } = useAuth();
  const location = useLocation();
  const { memberId = '' } = useParams<{ memberId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadDetails() {
      setLoading(true);
      setError('');

      try {
        const state = (location.state as LocationState | null) ?? null;
        let match: Assignment | null = null;

        if (state?.member && state.member.memberId === memberId) {
          match = { member: state.member, activePlan: state.activePlan ?? null };
        } else {
          if (!tso) {
            throw new Error('Unable to load thrift saver details.');
          }
          const rows = await getAssignments(tso.tsoId);
          match = rows.find((item) => item.member.memberId === memberId) ?? null;
        }

        if (!isActive) return;
        setAssignment(match);

        if (!match) {
          setStatementEntries([]);
          return;
        }

        const [collections, withdrawals] = await Promise.all([
          getCollections(),
          getWithdrawals(),
        ]);

        if (!isActive) return;

        const memberCollections = collections
          .filter((item) => item.memberId === match?.member.memberId)
          .map((item) => ({
            id: item.collectionId,
            timestamp: new Date(item.timestamp),
            type: 'collection' as const,
            method: methodLabel(item.method),
            status: item.status,
            amount: Number(item.amount) || 0,
          }));

        const memberWithdrawals = withdrawals
          .filter((item) => item.memberId === match?.member.memberId)
          .map((item) => ({
            id: item.withdrawalId,
            timestamp: new Date(item.requestedAt),
            type: 'withdrawal' as const,
            method: methodLabel(item.disbursementMethod),
            status: item.status,
            amount: Number(item.amount) || 0,
          }));

        setStatementEntries(
          [...memberCollections, ...memberWithdrawals]
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
        );
      } catch (e) {
        if (!isActive) return;
        setError(e instanceof Error ? e.message : 'Unable to load thrift saver details.');
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadDetails();

    return () => {
      isActive = false;
    };
  }, [location.state, memberId, tso]);

  const member = assignment?.member;
  const activePlan = assignment?.activePlan;
  const statementSummary = useMemo(() => {
    let totalCollections = 0;
    let totalWithdrawals = 0;

    statementEntries.forEach((entry) => {
      if (entry.type === 'collection') {
        totalCollections += entry.amount;
      } else {
        totalWithdrawals += entry.amount;
      }
    });

    return {
      totalCollections,
      totalWithdrawals,
      movementCount: statementEntries.length,
    };
  }, [statementEntries]);

  const statementRowsWithBalance = useMemo(() => {
    let running = Number(member?.savingsBalance ?? 0);

    return statementEntries.map((entry) => {
      const balanceAtEntry = running;
      const isEffective = affectsBalance(entry);

      if (isEffective) {
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
  }, [member?.savingsBalance, statementEntries]);

  return (
    <Layout
      title="Thrift Saver Details"
      action={
        <Link to="/thrift-savers" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
          Back to Thrift Savers
        </Link>
      }
    >
      {loading && <div className="spinner" aria-label="Loading thrift saver details" />}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && !member && (
        <div className="empty-state">Thrift saver not found.</div>
      )}

      {!loading && !error && member && (
        <>
          <div className="card static">
            <div className="card-title" style={{ marginBottom: 8 }}>{member.name}</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Member ID: {member.memberId}</div>
            <div className="card-sub">Account Number: {member.accountNumber}</div>
          </div>

          <div className="card static">
            <div className="section-label">Contact Details</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Phone: {member.phone ?? 'N/A'}</div>
            <div className="card-sub" style={{ marginBottom: 4 }}>Email: {member.email ?? 'N/A'}</div>
            <div className="card-sub">Address: {member.address ?? 'N/A'}</div>
          </div>

          <div className="card static">
            <div className="section-label">Savings Snapshot</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
              ₦{Number(member.savingsBalance ?? 0).toLocaleString()}
            </div>
            <div className="card-sub" style={{ marginBottom: 4 }}>
              KYC Status: <span className={`badge badge-${member.kycStatus}`}>{member.kycStatus}</span>
            </div>
            {activePlan ? (
              <div className="card-sub">
                Active Plan: {activePlan.name} • ₦{activePlan.amount.toLocaleString()} / {activePlan.frequency}
              </div>
            ) : (
              <div className="card-sub" style={{ color: 'var(--warning)' }}>No active plan</div>
            )}
            <div style={{ marginTop: 14 }}>
              <Link
                to="/kyc-update"
                state={{ memberId: member.memberId, autoEdit: true }}
                className="btn btn-primary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                Update KYC
              </Link>
            </div>
          </div>

          <div className="card static">
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Account Statement</div>
              <div className="card-sub">{statementSummary.movementCount} entries</div>
            </div>

            <div className="row" style={{ marginBottom: 12, gap: 8 }}>
              <span className="badge badge-matched">Collections: ₦{statementSummary.totalCollections.toLocaleString()}</span>
              <span className="badge badge-flagged">Withdrawals: ₦{statementSummary.totalWithdrawals.toLocaleString()}</span>
            </div>

            {statementEntries.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 0 }}>No statement entries yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Date</th>
                      <th style={{ textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Method</th>
                      <th style={{ textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Status</th>
                      <th style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Debit</th>
                      <th style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Credit</th>
                      <th style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', padding: '8px 6px' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementRowsWithBalance.map((entry) => (
                      <tr key={`${entry.type}-${entry.id}`}>
                        <td style={{ padding: '10px 6px', borderTop: '1px solid var(--line)' }}>
                          {entry.timestamp.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 6px', borderTop: '1px solid var(--line)' }}>{entry.method}</td>
                        <td style={{ padding: '10px 6px', borderTop: '1px solid var(--line)' }}>
                          <span className={`badge ${entry.status === 'confirmed' || entry.status === 'approved' || entry.status === 'disbursed' ? 'badge-matched' : entry.status === 'pending' ? 'badge-pending' : 'badge-flagged'}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderTop: '1px solid var(--line)',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: entry.type === 'withdrawal' ? 'var(--danger)' : 'var(--text-muted)',
                          }}
                        >
                          {entry.type === 'withdrawal' ? `₦${entry.amount.toLocaleString()}` : '-'}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderTop: '1px solid var(--line)',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: entry.type === 'collection' ? 'var(--success)' : 'var(--text-muted)',
                          }}
                        >
                          {entry.type === 'collection' ? `₦${entry.amount.toLocaleString()}` : '-'}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderTop: '1px solid var(--line)',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: 'var(--primary)',
                          }}
                        >
                          ₦{entry.balanceAtEntry.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
