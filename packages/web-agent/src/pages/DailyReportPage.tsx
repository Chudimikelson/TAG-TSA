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

  async function loadReport() {
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

  useEffect(() => {
    void loadReport();
  }, []);

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
    return {
      dayCollections,
      validCollections,
      rejectedCollections,
      withdrawalTotals,
      collectionsByMethod,
      totalCollections,
      netAmount: totalCollections - withdrawalTotals.effective,
      dayWithdrawalCount: dayWithdrawals.length,
    };
  }, [collections, reportDate, withdrawals]);

  return (
    <Layout title="Daily Report">
      {loading && <div className="spinner" aria-label="Loading" />}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <>
          <div className="card static daily-report-header-card">
            <div className="daily-report-header-row">
              <div>
                <div className="daily-report-label">TSO</div>
                <div className="daily-report-agent-name">{tso?.name ?? 'Agent'}</div>
              </div>
              <div className="daily-report-date-wrap">
                <div className="daily-report-label">Report Date</div>
                <input
                  className="daily-report-date-input"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="daily-report-section">
            <h3 className="daily-report-section-title">Collections</h3>

            <div className="daily-report-method-grid">
              <div className="card static">
                <div className="daily-report-label">Cash</div>
                <div className="daily-report-value">₦{reportData.collectionsByMethod.cash.toLocaleString()}</div>
              </div>

              <div className="card static">
                <div className="daily-report-label">Transfer (TSA)</div>
                <div className="daily-report-value">₦{reportData.collectionsByMethod.tsa.toLocaleString()}</div>
              </div>

              <div className="card static">
                <div className="daily-report-label">Transfer (Pool)</div>
                <div className="daily-report-value">₦{reportData.collectionsByMethod.tagora_pool.toLocaleString()}</div>
              </div>
            </div>

            <div
              className="card static"
              style={{ marginTop: 12, background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)' }}
            >
              <div className="daily-report-label">Total Collections</div>
              <div className="daily-report-total-positive">₦{reportData.totalCollections.toLocaleString()}</div>
              <div className="daily-report-caption">
                {reportData.validCollections.length} valid transaction{reportData.validCollections.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="daily-report-section">
            <h3 className="daily-report-section-title">Withdrawals</h3>

            <div
              className="card static"
              style={{ background: '#fef3f2', borderLeft: '4px solid #d32f2f' }}
            >
              <div className="daily-report-label">Total Withdrawals</div>
              <div className="daily-report-total-negative">₦{reportData.withdrawalTotals.effective.toLocaleString()}</div>
              <div className="daily-report-caption">
                Total requested: ₦{reportData.withdrawalTotals.requested.toLocaleString()} • Pending: ₦{reportData.withdrawalTotals.pending.toLocaleString()} • Rejected: ₦{reportData.withdrawalTotals.rejected.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="daily-report-section">
            <h3 className="daily-report-section-title">Closing Balance</h3>

            <div
              className="card static"
              style={{ background: reportData.netAmount >= 0 ? '#f0f7ff' : '#fef3f2', borderLeft: `4px solid ${reportData.netAmount >= 0 ? 'var(--primary)' : '#d32f2f'}` }}
            >
              <div className="daily-report-label">Net Amount (Collections - Effective Withdrawals)</div>
              <div className={`daily-report-net ${reportData.netAmount >= 0 ? 'is-positive' : 'is-negative'}`}>
                ₦{reportData.netAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
