import { useEffect, useState } from 'react';
import type { WithdrawalRequest } from '@tagora/shared';
import {
  approveWithdrawal,
  getWithdrawals,
  rejectWithdrawal,
} from '../api/withdrawals.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function WithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getWithdrawals();
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(id: string) {
    try {
      await approveWithdrawal(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this withdrawal request?')) return;
    try {
      await rejectWithdrawal(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Withdrawal Requests</h1>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Table
          rows={rows}
          keyFn={(r) => r.withdrawalId}
          emptyMessage="No withdrawal requests."
          columns={[
            { header: 'ID', render: (r) => r.withdrawalId },
            { header: 'Member', render: (r) => r.memberId },
            { header: 'Plan', render: (r) => r.planId },
            {
              header: 'Amount (₦)',
              render: (r) => r.amount.toLocaleString(),
            },
            { header: 'Method', render: (r) => r.disbursementMethod },
            {
              header: 'Status',
              render: (r) => <Badge value={r.status} />,
            },
            {
              header: 'Requested',
              render: (r) =>
                new Date(r.requestedAt).toLocaleDateString('en-NG'),
            },
            {
              header: 'Actions',
              render: (r) =>
                r.status === 'pending' ? (
                  <span className={styles.row}>
                    <button
                      className={styles.btnSuccess}
                      onClick={() => handleApprove(r.withdrawalId)}
                    >
                      Approve
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => handleReject(r.withdrawalId)}
                    >
                      Reject
                    </button>
                  </span>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
