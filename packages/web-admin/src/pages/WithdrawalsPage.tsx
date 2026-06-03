import { useEffect, useMemo, useState } from 'react';
import type { WithdrawalRequest } from '@tagora/shared';
import {
  getWithdrawals,
} from '../api/withdrawals.js';
import { getMembers } from '../api/members.js';
import { getTsos } from '../api/tsos.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

type WithdrawalMethodFilter = 'all' | 'bank_transfer' | 'cash' | 'mobile_money';

type EnrichedWithdrawalRow = WithdrawalRequest & {
  customerName: string;
  accountNumber: string;
  requesterName: string;
};

export function WithdrawalsPage() {
  const [rows, setRows] = useState<EnrichedWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<WithdrawalMethodFilter>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [withdrawalsRes, membersRes, tsosRes] = await Promise.all([
        getWithdrawals(),
        getMembers(),
        getTsos(),
      ]);

      const memberMap = new Map(
        membersRes.data.map((member) => [
          member.memberId,
          {
            name: member.name,
            accountNumber: member.accountNumber,
          },
        ]),
      );

      const tsoMap = new Map(tsosRes.data.map((tso) => [tso.tsoId, tso.name]));

      const enrichedRows: EnrichedWithdrawalRow[] = withdrawalsRes.data.map((row) => {
        const member = memberMap.get(row.memberId);
        return {
          ...row,
          customerName: member?.name ?? row.memberId,
          accountNumber: member?.accountNumber ?? row.memberId,
          requesterName: tsoMap.get(row.requesterTsoId) ?? row.requesterTsoId,
        };
      });

      setRows(enrichedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (methodFilter !== 'all' && row.disbursementMethod !== methodFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          row.withdrawalId,
          row.memberId,
          row.planId,
          row.customerName,
          row.accountNumber,
          row.requesterTsoId,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => Number(new Date(b.requestedAt)) - Number(new Date(a.requestedAt)));
  }, [methodFilter, rows, search]);

  const summary = useMemo(() => {
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const pendingAmount = rows
      .filter((row) => row.status === 'pending')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const approvedAmount = rows
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const rejectedAmount = rows
      .filter((row) => row.status === 'rejected')
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const pendingCount = rows.filter((row) => row.status === 'pending').length;
    const approvedCount = rows.filter((row) => row.status === 'approved').length;
    const rejectedCount = rows.filter((row) => row.status === 'rejected').length;

    return {
      totalCount: rows.length,
      totalAmount,
      pendingAmount,
      approvedAmount,
      rejectedAmount,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }, [rows]);

  return (
    <div>
      <h1 className={styles.heading}>Withdrawal Requests</h1>
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.success}>{notice}</p>}

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.label}>
            <span>Total Requests</span>
            <strong>₦{summary.totalAmount.toLocaleString()}</strong>
            <small>{summary.totalCount.toLocaleString()} request{summary.totalCount === 1 ? '' : 's'}</small>
          </div>
          <div className={styles.label}>
            <span>Pending</span>
            <strong>₦{summary.pendingAmount.toLocaleString()}</strong>
            <small>{summary.pendingCount.toLocaleString()} request{summary.pendingCount === 1 ? '' : 's'}</small>
          </div>
          <div className={styles.label}>
            <span>Approved</span>
            <strong>₦{summary.approvedAmount.toLocaleString()}</strong>
            <small>{summary.approvedCount.toLocaleString()} request{summary.approvedCount === 1 ? '' : 's'}</small>
          </div>
          <div className={styles.label}>
            <span>Rejected</span>
            <strong>₦{summary.rejectedAmount.toLocaleString()}</strong>
            <small>{summary.rejectedCount.toLocaleString()} request{summary.rejectedCount === 1 ? '' : 's'}</small>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            <span>Find Request</span>
            <input
              className={styles.input}
              type="search"
              placeholder="Search by customer, account, member, plan or request ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            <span>Method</span>
            <select
              className={styles.input}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as WithdrawalMethodFilter)}
            >
              <option value="all">All methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-label="Loading" />
      ) : (
        <Table
          rows={filteredRows}
          keyFn={(r) => r.withdrawalId}
          emptyMessage="No withdrawal requests."
          columns={[
            {
              header: 'Request',
              render: (r) => (
                <span>
                  <strong>{r.withdrawalId}</strong>
                  <br />
                  <small>{new Date(r.requestedAt).toLocaleDateString('en-NG')}</small>
                </span>
              ),
            },
            {
              header: 'Customer',
              render: (r) => (
                <span>
                  <strong>{r.customerName}</strong>
                </span>
              ),
            },
            { header: 'Account Number', render: (r) => r.accountNumber },
            {
              header: 'Amount (₦)',
              render: (r) => r.amount.toLocaleString(),
            },
            {
              header: 'Method',
              render: (r) => r.disbursementMethod.replace(/_/g, ' '),
            },
            {
              header: 'Requested By',
              render: (r) => r.requesterName,
            },
          ]}
        />
      )}
    </div>
  );
}
