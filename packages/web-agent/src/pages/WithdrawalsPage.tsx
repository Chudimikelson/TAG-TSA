import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { getWithdrawals } from '../api/withdrawals.js';
import type { WithdrawalRequest } from '@tagora/shared';

type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

function statusBadge(status: string) {
  const s = status as WithdrawalStatus;
  const map: Record<WithdrawalStatus, string> = {
    pending:   'badge-pending',
    approved:  'badge-approved',
    rejected:  'badge-rejected',
    disbursed: 'badge-disbursed',
  };
  return `badge ${map[s] ?? 'badge-pending'}`;
}

export function WithdrawalsPage() {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getWithdrawals()
      .then(setWithdrawals)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout
      title="Withdrawals"
      action={
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/withdrawals/new')}
        >
          + New Request
        </button>
      }
    >
      {loading && <div className="spinner">Loading…</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && withdrawals.length === 0 && (
        <div className="empty-state">No withdrawal requests yet.</div>
      )}

      {withdrawals.map((w) => (
        <div key={w.withdrawalId} className="card static">
          <div className="row">
            <div className="card-amount">₦{Number(w.amount).toLocaleString()}</div>
            <span className={statusBadge(w.status)}>{w.status}</span>
          </div>
          <div className="card-sub" style={{ marginTop: 6 }}>
            Requested {new Date(w.requestedAt).toLocaleDateString()} ·{' '}
            {w.disbursementMethod.replace(/_/g, ' ')}
          </div>
        </div>
      ))}
    </Layout>
  );
}
