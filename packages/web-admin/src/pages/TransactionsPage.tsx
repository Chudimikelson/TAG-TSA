import { useEffect, useState } from 'react';
import type { Transaction } from '@tagora/shared';
import {
  getUnmatchedTransactions,
  manualMatch,
} from '../api/reconciliation.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchInputs, setMatchInputs] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getUnmatchedTransactions();
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleMatch(txId: string) {
    const collectionId = matchInputs[txId]?.trim();
    if (!collectionId) {
      alert('Enter a Collection ID');
      return;
    }
    try {
      await manualMatch(txId, collectionId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Unmatched Transactions</h1>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Table
          rows={rows}
          keyFn={(r) => r.transactionId}
          emptyMessage="No unmatched transactions."
          columns={[
            { header: 'Transaction ID', render: (r) => r.transactionId },
            { header: 'External Ref', render: (r) => r.externalRef },
            {
              header: 'Amount (₦)',
              render: (r) => r.amount.toLocaleString(),
            },
            { header: 'Method', render: (r) => r.method },
            {
              header: 'Status',
              render: (r) => <Badge value={r.status} />,
            },
            {
              header: 'Date',
              render: (r) =>
                new Date(r.timestamp).toLocaleDateString('en-NG'),
            },
            {
              header: 'Match to Collection',
              render: (r) => (
                <span className={styles.row}>
                  <input
                    className={styles.input}
                    placeholder="Collection ID"
                    value={matchInputs[r.transactionId] ?? ''}
                    onChange={(e) =>
                      setMatchInputs((prev) => ({
                        ...prev,
                        [r.transactionId]: e.target.value,
                      }))
                    }
                    style={{ width: 160 }}
                  />
                  <button
                    className={styles.btnPrimary}
                    onClick={() => handleMatch(r.transactionId)}
                  >
                    Match
                  </button>
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
