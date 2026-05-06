import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Layout } from '../components/Layout.js';
import { getCollections } from '../api/collections.js';
import { getWithdrawals } from '../api/withdrawals.js';
import type { Collection } from '@tagora/shared';
import type { WithdrawalRequest } from '@tagora/shared';

export function DailyReportPage() {
  const { tso } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const [cols, withs] = await Promise.all([
          getCollections(),
          getWithdrawals(),
        ]);
        setCollections(cols);
        setWithdrawals(withs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Calculate today's collections and withdrawals
  const today = new Date().toDateString();
  const todayCollections = collections.filter(
    (c) => new Date(c.timestamp).toDateString() === today,
  );
  const todayWithdrawals = withdrawals.filter(
    (w) => new Date(w.requestedAt).toDateString() === today,
  );

  // Sum collections by method
  const collectionsByMethod = {
    cash: 0,
    tsa: 0,
    tagora_pool: 0,
  };
  todayCollections.forEach((c) => {
    const method = c.method as keyof typeof collectionsByMethod;
    if (method in collectionsByMethod) {
      collectionsByMethod[method] += c.amount;
    }
  });

  const totalCollections = Object.values(collectionsByMethod).reduce((a, b) => a + b, 0);
  const totalWithdrawals = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const netAmount = totalCollections - totalWithdrawals;

  return (
    <Layout title="Daily Report">
      {loading && <div className="spinner">Loading…</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <>
          {/* TSO Info Card */}
          <div className="card static" style={{ marginBottom: 20 }}>
            <div className="row">
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
                  TSO Agent
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{tso?.name ?? 'Agent'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
                  Report Date
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {new Date().toLocaleDateString('en-NG')}
                </div>
              </div>
            </div>
          </div>

          {/* Collections Summary */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>
              Collections
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {/* Cash */}
              <div className="card static">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Cash</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{collectionsByMethod.cash.toLocaleString()}</div>
              </div>

              {/* TSA Transfer */}
              <div className="card static">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Transfer (TSA)</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{collectionsByMethod.tsa.toLocaleString()}</div>
              </div>

              {/* Tagora-Pool Transfer */}
              <div className="card static">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Transfer (Pool)</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{collectionsByMethod.tagora_pool.toLocaleString()}</div>
              </div>
            </div>

            {/* Total Collections */}
            <div
              className="card static"
              style={{
                marginTop: 12,
                background: 'var(--primary-light)',
                borderLeft: '4px solid var(--primary)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Total Collections</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                ₦{totalCollections.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {todayCollections.length} transaction{todayCollections.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Withdrawals Summary */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>
              Withdrawals
            </h3>

            <div
              className="card static"
              style={{
                background: '#fef3f2',
                borderLeft: '4px solid #d32f2f',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Total Withdrawals</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d32f2f' }}>
                ₦{totalWithdrawals.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {todayWithdrawals.length} request{todayWithdrawals.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Net Summary */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>
              Closing Balance
            </h3>

            <div
              className="card static"
              style={{
                background: netAmount >= 0 ? '#f0f7ff' : '#fef3f2',
                borderLeft: `4px solid ${netAmount >= 0 ? 'var(--primary)' : '#d32f2f'}`,
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                Net Amount (Collections - Withdrawals)
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: netAmount >= 0 ? 'var(--primary)' : '#d32f2f',
                }}
              >
                ₦{netAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
