import { useEffect, useState } from 'react';
import type { Collection } from '@tagora/shared';
import { flagCollection, getCollections } from '../api/collections.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function CollectionsPage() {
  const [rows, setRows] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getCollections();
      setRows(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleFlag(id: string) {
    try {
      await flagCollection(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Collections</h1>
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Table
          rows={rows}
          keyFn={(r) => r.collectionId}
          emptyMessage="No collections found."
          columns={[
            { header: 'ID', render: (r) => r.collectionId },
            { header: 'Member', render: (r) => r.memberId },
            { header: 'TSO', render: (r) => r.tsoId },
            { header: 'Amount (₦)', render: (r) => r.amount.toLocaleString() },
            { header: 'Method', render: (r) => r.method },
            { header: 'Status', render: (r) => <Badge value={r.status} /> },
            {
              header: 'Date',
              render: (r) =>
                new Date(r.timestamp).toLocaleDateString('en-NG'),
            },
            {
              header: 'Actions',
              render: (r) =>
                r.status !== 'flagged' ? (
                  <button
                    className={styles.btnDanger}
                    onClick={() => handleFlag(r.collectionId)}
                  >
                    Flag
                  </button>
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
