import { FormEvent, useState } from 'react';
import {
  createReconciliation,
  downloadCollectionsCsv,
} from '../api/reconciliation.js';
import styles from './Page.module.css';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReconciliationPage() {
  const [date, setDate] = useState(today());
  const [expectedTotal, setExpectedTotal] = useState('');
  const [cashCounted, setCashCounted] = useState('');
  const [transfersTotal, setTransfersTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await createReconciliation({
        date: new Date(date).toISOString(),
        expectedTotal: Number(expectedTotal),
        cashCounted: Number(cashCounted),
        transfersTotal: Number(transfersTotal),
        notes: notes || undefined,
      });
      const variance =
        Number(cashCounted) + Number(transfersTotal) - Number(expectedTotal);
      setSuccessMsg(
        `Reconciliation saved. Variance: ₦${variance.toLocaleString()}`,
      );
      setExpectedTotal('');
      setCashCounted('');
      setTransfersTotal('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadCsv() {
    try {
      const csv = await downloadCollectionsCsv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collections.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>Reconciliation</h1>

      <div className={styles.card}>
        <h2 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>
          New Reconciliation Record
        </h2>
        {error && <p className={styles.error}>{error}</p>}
        {successMsg && <p className={styles.success}>{successMsg}</p>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              Date
              <input
                className={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className={styles.label}>
              Expected Total (₦)
              <input
                className={styles.input}
                type="number"
                min="0"
                value={expectedTotal}
                onChange={(e) => setExpectedTotal(e.target.value)}
                required
              />
            </label>
            <label className={styles.label}>
              Cash Counted (₦)
              <input
                className={styles.input}
                type="number"
                min="0"
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                required
              />
            </label>
            <label className={styles.label}>
              Transfers Total (₦)
              <input
                className={styles.input}
                type="number"
                min="0"
                value={transfersTotal}
                onChange={(e) => setTransfersTotal(e.target.value)}
                required
              />
            </label>
          </div>
          <label className={styles.label} style={{ marginBottom: 16 }}>
            Notes (optional)
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className={styles.btnPrimary} type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Record'}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>
          Export
        </h2>
        <button className={styles.btnPrimary} onClick={handleDownloadCsv}>
          Download Collections CSV
        </button>
      </div>
    </div>
  );
}
