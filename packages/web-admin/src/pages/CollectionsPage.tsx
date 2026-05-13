import { useEffect, useMemo, useState } from 'react';
import type { Collection } from '@tagora/shared';
import { confirmCollection, getCollections, rejectCollection } from '../api/collections.js';
import { getMembers } from '../api/members.js';
import { getTsos } from '../api/tsos.js';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import styles from './Page.module.css';

type EnrichedCollectionRow = Collection & {
  customerName: string;
  accountNumber: string;
  tsoName: string;
};

type ScheduleStatus = 'pending' | 'completed';

interface CollectionSchedule {
  scheduleId: string;
  tsoId: string;
  tsoName: string;
  uploadedAtMs: number;
  totalAmount: number;
  status: ScheduleStatus;
  collections: EnrichedCollectionRow[];
}

const SCHEDULE_GAP_MS = 2 * 60 * 1000;

function toEpochMs(value: Date | string): number {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function deriveScheduleStatus(collections: EnrichedCollectionRow[]): ScheduleStatus {
  return collections.some((row) => row.status === 'pending') ? 'pending' : 'completed';
}

function buildSchedules(rows: EnrichedCollectionRow[]): CollectionSchedule[] {
  const byTso = new Map<string, EnrichedCollectionRow[]>();
  for (const row of rows) {
    const list = byTso.get(row.tsoId) ?? [];
    list.push(row);
    byTso.set(row.tsoId, list);
  }

  const schedules: CollectionSchedule[] = [];
  for (const [tsoId, tsoRows] of byTso.entries()) {
    const sorted = [...tsoRows].sort((a, b) => toEpochMs(a.timestamp) - toEpochMs(b.timestamp));
    let bucket: EnrichedCollectionRow[] = [];
    let bucketStartMs = 0;
    let lastMs = 0;
    let batchIndex = 0;

    const flush = () => {
      if (bucket.length === 0) return;
      batchIndex += 1;
      const totalAmount = bucket.reduce((sum, row) => sum + Number(row.amount), 0);
      const uploadedAtMs = bucketStartMs;
      const tsoName = bucket[0]?.tsoName ?? tsoId;
      schedules.push({
        scheduleId: `${tsoId}-${uploadedAtMs}-${batchIndex}`,
        tsoId,
        tsoName,
        uploadedAtMs,
        totalAmount,
        status: deriveScheduleStatus(bucket),
        collections: bucket,
      });
      bucket = [];
      bucketStartMs = 0;
      lastMs = 0;
    };

    for (const row of sorted) {
      const ts = toEpochMs(row.timestamp);
      if (bucket.length === 0) {
        bucket = [row];
        bucketStartMs = ts;
        lastMs = ts;
        continue;
      }

      if (ts - lastMs <= SCHEDULE_GAP_MS) {
        bucket.push(row);
        lastMs = ts;
      } else {
        flush();
        bucket = [row];
        bucketStartMs = ts;
        lastMs = ts;
      }
    }

    flush();
  }

  return schedules.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function CollectionsPage() {
  const [rows, setRows] = useState<EnrichedCollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedRowId, setCopiedRowId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [collectionsRes, membersRes, tsosRes] = await Promise.all([
        getCollections(),
        getMembers(),
        getTsos(),
      ]);

      const memberMap = new Map(
        membersRes.data.map((member) => [
          member.memberId,
          {
            name: member.name,
            accountNumber: member.accountNumber,
          },
        ]),
      );

      const tsoMap = new Map(tsosRes.data.map((tso) => [tso.tsoId, tso.name]));

      const enrichedRows: EnrichedCollectionRow[] = collectionsRes.data.map((row) => {
        const member = memberMap.get(row.memberId);
        return {
          ...row,
          customerName: member?.name ?? row.memberId,
          accountNumber: member?.accountNumber ?? row.memberId,
          tsoName: tsoMap.get(row.tsoId) ?? row.tsoId,
        };
      });

      setRows(enrichedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleConfirm(id: string) {
    try {
      await confirmCollection(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectCollection(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleCopyAccount(accountNumber: string, rowId: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedRowId(rowId);
      window.setTimeout(() => setCopiedRowId(''), 1200);
    } catch {
      alert('Unable to copy account number.');
    }
  }

  const filteredRows = useMemo(() => {
    return [...rows].sort((a, b) => toEpochMs(b.timestamp) - toEpochMs(a.timestamp));
  }, [rows]);

  const schedules = useMemo(() => buildSchedules(filteredRows), [filteredRows]);

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schedules;

    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.uploadedAtMs).toLocaleDateString('en-NG');
      const haystack = [
        schedule.scheduleId,
        schedule.tsoName,
        schedule.status,
        scheduleDate,
        schedule.collections.length,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [schedules, search]);

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.scheduleId === selectedScheduleId),
    [schedules, selectedScheduleId],
  );

  useEffect(() => {
    if (!selectedScheduleId) return;
    if (!selectedSchedule) {
      setSelectedScheduleId('');
    }
  }, [selectedSchedule, selectedScheduleId]);

  const summary = useMemo(() => {
    const totalAmount = filteredSchedules.reduce((sum, schedule) => sum + Number(schedule.totalAmount), 0);
    const pendingCount = filteredSchedules.filter((schedule) => schedule.status === 'pending').length;
    const completedCount = filteredSchedules.filter((schedule) => schedule.status === 'completed').length;

    return {
      totalCount: filteredSchedules.length,
      totalAmount,
      pendingCount,
      completedCount,
    };
  }, [filteredSchedules]);

  function handleExportCsv() {
    if (!filteredSchedules.length && !selectedSchedule) {
      alert('No rows to export.');
      return;
    }

    const csv = selectedSchedule
      ? [
        ['Account Number', 'Customer Name', 'TSO Name', 'Amount (NGN)', 'Method', 'Status', 'Date'].join(','),
        ...selectedSchedule.collections.map((row) => [
          escapeCsv(row.accountNumber),
          escapeCsv(row.customerName),
          escapeCsv(row.tsoName),
          escapeCsv(row.amount),
          escapeCsv(row.method),
          escapeCsv(row.status),
          escapeCsv(new Date(row.timestamp).toLocaleDateString('en-NG')),
        ].join(',')),
      ].join('\n')
      : [
        ['Schedule Ref', 'TSO Name', 'Items', 'Total Amount (NGN)', 'Status', 'Uploaded Date'].join(','),
        ...filteredSchedules.map((schedule) => [
          escapeCsv(schedule.scheduleId),
          escapeCsv(schedule.tsoName),
          escapeCsv(schedule.collections.length),
          escapeCsv(schedule.totalAmount),
          escapeCsv(schedule.status),
          escapeCsv(new Date(schedule.uploadedAtMs).toLocaleDateString('en-NG')),
        ].join(',')),
      ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedSchedule
      ? `collection-schedule-${selectedSchedule.scheduleId}.csv`
      : `collection-schedules-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className={styles.heading}>Collections</h1>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            <span>Search Schedules</span>
            <input
              className={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TSO, status, schedule reference, or date"
            />
          </label>
          <label className={styles.label}>
            <span>&nbsp;</span>
            <button className={styles.btnPrimary} type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
          </label>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.label}><span>Total Schedules</span><strong>{summary.totalCount}</strong></div>
          <div className={styles.label}><span>Total Amount</span><strong>₦{summary.totalAmount.toLocaleString()}</strong></div>
          <div className={styles.label}><span>Pending</span><strong>{summary.pendingCount}</strong></div>
            <div className={styles.label}><span>Completed</span><strong>{summary.completedCount}</strong></div>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        selectedSchedule ? (
          <div>
            <div className={styles.card}>
              <div className={styles.row} style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p className={styles.sectionTitle}>Schedule Review</p>
                  <p className={styles.sectionSub}>
                    {selectedSchedule.tsoName} · {new Date(selectedSchedule.uploadedAtMs).toLocaleDateString('en-NG')} · {selectedSchedule.collections.length} collection{selectedSchedule.collections.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button className={styles.btnSmall} type="button" onClick={() => setSelectedScheduleId('')}>
                  Back To Schedules
                </button>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.label}><span>Total Amount</span><strong>₦{selectedSchedule.totalAmount.toLocaleString()}</strong></div>
                <div className={styles.label}><span>Status</span><strong><Badge value={selectedSchedule.status} /></strong></div>
              </div>
            </div>

            <Table
              rows={selectedSchedule.collections}
              keyFn={(r) => r.collectionId}
              emptyMessage="No collections in this schedule."
              columns={[
                {
                  header: 'Account Number',
                  render: (r) => (
                    <span className={styles.row}>
                      <span>{r.accountNumber}</span>
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => handleCopyAccount(r.accountNumber, r.collectionId)}
                        title="Copy account number"
                        aria-label="Copy account number"
                      >
                        {copiedRowId === r.collectionId ? 'Copied' : '⧉'}
                      </button>
                    </span>
                  ),
                },
                { header: 'Customer Name', render: (r) => r.customerName },
                { header: 'TSO', render: (r) => r.tsoName },
                { header: 'Amount (₦)', render: (r) => r.amount.toLocaleString() },
                { header: 'Method', render: (r) => r.method },
                { header: 'Status', render: (r) => <Badge value={r.status} /> },
                {
                  header: 'Date',
                  render: (r) => new Date(r.timestamp).toLocaleDateString('en-NG'),
                },
                {
                  header: 'Actions',
                  render: (r) =>
                    r.status === 'pending' ? (
                      <span className={styles.row}>
                        <button
                          className={styles.btnSuccess}
                          onClick={() => handleConfirm(r.collectionId)}
                        >
                          Confirm
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleReject(r.collectionId)}
                        >
                          Reject
                        </button>
                      </span>
                    ) : (
                      '—'
                    ),
                },
              ]}
            />
          </div>
        ) : (
          <Table
            rows={filteredSchedules}
            keyFn={(r) => r.scheduleId}
            emptyMessage="No schedules found."
            columns={[
              { header: 'Schedule Ref', render: (r) => r.scheduleId.slice(-10) },
              { header: 'TSO Name', render: (r) => r.tsoName },
              { header: 'Items', render: (r) => r.collections.length },
              { header: 'Total (₦)', render: (r) => r.totalAmount.toLocaleString() },
              { header: 'Status', render: (r) => <Badge value={r.status} /> },
              {
                header: 'Date',
                render: (r) => new Date(r.uploadedAtMs).toLocaleDateString('en-NG'),
              },
              {
                header: 'Actions',
                render: (r) => (
                  <button className={styles.btnPrimary} type="button" onClick={() => setSelectedScheduleId(r.scheduleId)}>
                    Open Schedule
                  </button>
                ),
              },
            ]}
          />
        )
      )}
    </div>
  );
}
