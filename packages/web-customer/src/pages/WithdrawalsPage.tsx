import { useEffect, useState } from 'react';
import type { WithdrawalRequest } from '@tagora/shared';
import { getWithdrawals } from '../api/customer.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

export function WithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getWithdrawals()
      .then((res) => setRows(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <h1>My Withdrawals</h1>
      {rows.length === 0 ? (
        <p className={styles.loading}>No withdrawal requests yet.</p>
      ) : (
        <Table headers={['Date', 'Amount', 'Method', 'Status']}>
          {rows.map((w) => (
            <tr key={w.withdrawalId}>
              <td>{new Date(w.requestedAt).toLocaleDateString()}</td>
              <td>{w.amount.toLocaleString()}</td>
              <td>{w.disbursementMethod.replace('_', ' ')}</td>
              <td><Badge status={w.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
