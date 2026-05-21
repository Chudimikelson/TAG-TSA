import { useEffect, useMemo, useState } from 'react';
import type { Collection, WithdrawalRequest } from '@tagora/shared';
import { useAuth } from '../context/AuthContext.js';
import { getCollections } from '../api/collections.js';
import { getWithdrawals } from '../api/withdrawals.js';
import { getTsos, type TsoItem } from '../api/tsos.js';
import styles from './DashboardPage.module.css';

const CARDS = [
  { label: 'Thrift Savers', to: '/members' },
  { label: 'Collections', to: '/collections' },
  { label: 'Pending Withdrawals', to: '/withdrawals' },
  { label: 'Unmatched Transactions', to: '/transactions' },
  { label: 'Reconciliation', to: '/reconciliation' },
];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const isCsm = user?.adminRole === 'CSM';

  const [collections, setCollections] = useState<Collection[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tsos, setTsos] = useState<TsoItem[]>([]);
  const [loading, setLoading] = useState(isCsm);
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState(() => toDateInputValue(new Date()));
  const [selectedTsoId, setSelectedTsoId] = useState('all');

  useEffect(() => {
    if (!isCsm) return;

    async function loadReport() {
      setLoading(true);
      setError('');
      try {
        const [collectionsRes, withdrawalsRes, tsosRes] = await Promise.all([
          getCollections(),
          getWithdrawals(),
          getTsos(),
        ]);

        setCollections(collectionsRes.data);
        setWithdrawals(withdrawalsRes.data);
        setTsos(tsosRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily report');
      } finally {
        setLoading(false);
      }
    }

    void loadReport();
  }, [isCsm]);

  const selectedDateLabel = useMemo(
    () => new Date(`${reportDate}T00:00:00`).toLocaleDateString('en-NG'),
    [reportDate],
  );

  const reportData = useMemo(() => {
    const selectedDayKey = new Date(`${reportDate}T00:00:00`).toDateString();

    const scopedCollections = selectedTsoId === 'all'
      ? collections
      : collections.filter((c) => c.tsoId === selectedTsoId);

    const dayCollections = scopedCollections.filter(
      (c) => new Date(c.timestamp).toDateString() === selectedDayKey,
    );

    const validCollections = dayCollections.filter((c) => c.status !== 'rejected');

    const scopedWithdrawals = selectedTsoId === 'all'
      ? withdrawals
      : withdrawals.filter((w) => w.requesterTsoId === selectedTsoId);

    const dayWithdrawals = scopedWithdrawals.filter(
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
      validCollections,
      withdrawalTotals,
      collectionsByMethod,
      totalCollections,
      netAmount: totalCollections - withdrawalTotals.effective,
    };
  }, [collections, reportDate, selectedTsoId, withdrawals]);

  if (isCsm) {
    return (
      <div>
        {error && <p className={styles.error}>{error}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className={styles.reportCard}>
              <div className={styles.reportHeaderRow}>
                <div>
                  <div className={styles.reportLabel}>TSO</div>
                  <select
                    className={styles.reportSelect}
                    value={selectedTsoId}
                    onChange={(e) => setSelectedTsoId(e.target.value)}
                  >
                    <option value="all">All TSOs</option>
                    {tsos.map((tso) => (
                      <option key={tso.tsoId} value={tso.tsoId}>
                        {tso.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.reportDateWrap}>
                  <div className={styles.reportLabel}>Report Date</div>
                  <input
                    className={styles.reportDateInput}
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                  <div className={styles.reportSub}>{selectedDateLabel}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 className={styles.sectionTitle}>Collections</h3>
              <div className={styles.reportGrid}>
                <div className={styles.reportCard}>
                  <div className={styles.reportLabel}>Cash</div>
                  <div className={styles.reportValue}>₦{reportData.collectionsByMethod.cash.toLocaleString()}</div>
                </div>
                <div className={styles.reportCard}>
                  <div className={styles.reportLabel}>Transfer (TSA)</div>
                  <div className={styles.reportValue}>₦{reportData.collectionsByMethod.tsa.toLocaleString()}</div>
                </div>
                <div className={styles.reportCard}>
                  <div className={styles.reportLabel}>Transfer (Pool)</div>
                  <div className={styles.reportValue}>₦{reportData.collectionsByMethod.tagora_pool.toLocaleString()}</div>
                </div>
              </div>

              <div className={`${styles.reportCard} ${styles.reportHighlightPositive}`}>
                <div className={styles.reportLabel}>Total Collections</div>
                <div className={styles.reportValueLarge}>₦{reportData.totalCollections.toLocaleString()}</div>
                <div className={styles.reportSub}>
                  {reportData.validCollections.length} valid transaction{reportData.validCollections.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 className={styles.sectionTitle}>Withdrawals</h3>
              <div className={`${styles.reportCard} ${styles.reportHighlightNegative}`}>
                <div className={styles.reportLabel}>Total Withdrawals</div>
                <div className={styles.reportValueLarge}>₦{reportData.withdrawalTotals.effective.toLocaleString()}</div>
                <div className={styles.reportSub}>
                  Total requested: ₦{reportData.withdrawalTotals.requested.toLocaleString()} | Pending: ₦{reportData.withdrawalTotals.pending.toLocaleString()} | Rejected: ₦{reportData.withdrawalTotals.rejected.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className={styles.sectionTitle}>Closing Balance</h3>
              <div className={`${styles.reportCard} ${reportData.netAmount >= 0 ? styles.reportHighlightPositive : styles.reportHighlightNegative}`}>
                <div className={styles.reportLabel}>Net Amount (Collections - Effective Withdrawals)</div>
                <div className={styles.reportValueXl}>₦{reportData.netAmount.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <div className={styles.grid}>
        {CARDS.map(({ label, to }) => (
          <a key={to} href={to} className={styles.card}>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
