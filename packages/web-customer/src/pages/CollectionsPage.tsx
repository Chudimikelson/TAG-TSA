import { useEffect, useState } from 'react';
import type { Collection } from '@tagora/shared';
import { getCollections } from '../api/customer.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function CollectionsPage() {
  const [rows, setRows] = useState<Collection[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getCollections()
      .then((res) => setRows(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <h1>My Collections</h1>
      {rows.length === 0 ? (
        <p className={styles.loading}>No collections yet.</p>
      ) : (
        <Table headers={['Date', 'Amount', 'Method', 'Status', 'Receipt']}>
          {rows.map((c) => (
            <tr key={c.collectionId}>
              <td>{new Date(c.timestamp).toLocaleDateString()}</td>
              <td>{c.amount.toLocaleString()}</td>
              <td>{c.method}</td>
              <td><Badge status={c.status} /></td>
              <td>
                {c.photoReceiptUrl ? (
                  <a href={c.photoReceiptUrl} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
