import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Layout } from '../components/Layout.js';
import { getAssignments, getCollections, type Assignment } from '../api/collections.js';
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState(() => toDateInputValue(new Date()));

  async function loadReport() {
    try {
      setLoading(true);
      setError('');
      const [cols, withs, assigned] = await Promise.all([
        getCollections(),
        getWithdrawals(),
        tso ? getAssignments(tso.tsoId) : Promise.resolve([]),
      ]);
      setCollections(cols);
      setWithdrawals(withs);
      setAssignments(assigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, [tso]);

  const memberNameById = useMemo(() => new Map(
    assignments.map(({ member }) => [member.memberId, member.name]),
  ), [assignments]);

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
      transfer: 0,
      direct: 0,
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
    <Layout title="Reports" className="daily-report-shell">
      {loading && <div className="spinner" aria-label="Loading" />}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <>
          <div className="daily-report-mobile">
            <h1>Summary</h1>
            <input className="daily-report-date-input" type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} aria-label="Report date" />
            <div className="daily-report-summary-card">
              <div><span>Cash</span><strong>₦{reportData.collectionsByMethod.cash.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
              <div><span>Transfer</span><strong>₦{reportData.collectionsByMethod.transfer.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
              <div><span>Direct</span><strong>₦{reportData.collectionsByMethod.direct.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
              <hr />
              <div><span>Total</span><strong>₦{reportData.totalCollections.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
            </div>
            <h2>Collection Details</h2>
            <div className="daily-report-collection-list">
              {reportData.validCollections.map((collection) => (
                <div className="daily-report-collection-row" key={collection.collectionId}>
                  <div>
                    <span>{memberNameById.get(collection.memberId) ?? collection.memberId}</span>
                    <strong>₦{Number(collection.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="daily-report-row-meta">
                    <span>{new Date(collection.timestamp).toLocaleDateString()}</span>
                    <b>{collection.method === 'cash' ? 'Cash' : collection.method === 'transfer' ? 'Transfer' : 'Direct'}</b>
                  </div>
                </div>
              ))}
              {reportData.validCollections.length === 0 && <div className="empty-state">No collections for this date.</div>}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
