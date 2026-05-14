import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Layout } from '../components/Layout.js';
import { getCollections } from '../api/collections.js';
import { getWithdrawals } from '../api/withdrawals.js';
import type { Collection } from '@tagora/shared';
import type { WithdrawalRequest } from '@tagora/shared';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DailyReportPage() {
  const { tso } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState(() => toDateInputValue(new Date()));

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

  const selectedDateLabel = useMemo(
    () => new Date(`${reportDate}T00:00:00`).toLocaleDateString('en-NG'),
    [reportDate],
  );

  const reportData = useMemo(() => {
    const selectedDayKey = new Date(`${reportDate}T00:00:00`).toDateString();

    const dayCollections = collections.filter(
      (c) => new Date(c.timestamp).toDateString() === selectedDayKey,
    );
    const rejectedCollections = dayCollections.filter((c) => c.status === 'rejected');
    const validCollections = dayCollections.filter((c) => c.status !== 'rejected');
    const dayWithdrawals = withdrawals.filter(
      (w) => new Date(w.requestedAt).toDateString() === selectedDayKey,
    );

    const withdrawalTotals = dayWithdrawals.reduce(
      (acc, w) => {
        acc.requested += w.amount;
        if (w.status === 'approved' || w.status === 'disbursed') {
          acc.effective += w.amount;
        }
        if (w.status === 'rejected') {
          acc.rejected += w.amount;
        }
        if (w.status === 'pending') {
          acc.pending += w.amount;
        }
        return acc;
      },
      { requested: 0, effective: 0, rejected: 0, pending: 0 },
    );

    const collectionsByMethod = {
      cash: 0,
      tsa: 0,
      tagora_pool: 0,
    };

    validCollections.forEach((c) => {
      const method = c.method as keyof typeof collectionsByMethod;
      if (method in collectionsByMethod) {
        collectionsByMethod[method] += c.amount;
      }
    });

    const totalCollections = Object.values(collectionsByMethod).reduce((a, b) => a + b, 0);
    const rejectedCollectionsTotal = rejectedCollections.reduce((sum, c) => sum + c.amount, 0);

    return {
      dayCollections,
      validCollections,
      rejectedCollections,
      withdrawalTotals,
      collectionsByMethod,
      totalCollections,
      rejectedCollectionsTotal,
      netAmount: totalCollections - withdrawalTotals.effective,
    };
  }, [collections, reportDate, withdrawals]);

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
                  TSO
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{tso?.name ?? 'Agent'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
                  Report Date
                </div>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111827',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: 'var(--white)',
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  {selectedDateLabel}
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
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{reportData.collectionsByMethod.cash.toLocaleString()}</div>
              </div>

              {/* TSA Transfer */}
              <div className="card static">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Transfer (TSA)</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{reportData.collectionsByMethod.tsa.toLocaleString()}</div>
              </div>

              {/* Tagora-Pool Transfer */}
              <div className="card static">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Transfer (Pool)</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₦{reportData.collectionsByMethod.tagora_pool.toLocaleString()}</div>
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
                ₦{reportData.totalCollections.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {reportData.validCollections.length} valid transaction{reportData.validCollections.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Excludes rejected records from totals
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
                ₦{reportData.withdrawalTotals.effective.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Deducted from approved/disbursed requests only
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Total requested: ₦{reportData.withdrawalTotals.requested.toLocaleString()} • Pending: ₦{reportData.withdrawalTotals.pending.toLocaleString()} • Rejected: ₦{reportData.withdrawalTotals.rejected.toLocaleString()}
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
                background: reportData.netAmount >= 0 ? '#f0f7ff' : '#fef3f2',
                borderLeft: `4px solid ${reportData.netAmount >= 0 ? 'var(--primary)' : '#d32f2f'}`,
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                Net Amount (Collections - Effective Withdrawals)
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: reportData.netAmount >= 0 ? 'var(--primary)' : '#d32f2f',
                }}
              >
                ₦{reportData.netAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
