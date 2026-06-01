import { useEffect, useMemo, useState } from 'react';
import type { Collection } from '@tagora/shared';
import { confirmCollection, getCollections, rejectCollection } from '../api/collections.js';
import { getMembers } from '../api/members.js';
import { getTsos } from '../api/tsos.js';
import { Badge } from '../components/Badge.js';
import pageStyles from './Page.module.css';
import styles from './CollectionsPage.module.css';

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
const SCHEDULES_PAGE_SIZE = 5;

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

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDayKey(value: number): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(value: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const rowDay = new Date(new Date(value).getFullYear(), new Date(value).getMonth(), new Date(value).getDate());

  if (rowDay.getTime() === today.getTime()) return 'Today';
  if (rowDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return rowDay.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CollectionsPage() {
  const [rows, setRows] = useState<EnrichedCollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedRowId, setCopiedRowId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'all' | Collection['method']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'pending-first'>('newest');
  const [schedulePage, setSchedulePage] = useState(1);

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

  const visibleSchedules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let next = [...schedules];

    if (q) {
      next = next.filter((schedule) => {
        const ref = schedule.scheduleId.slice(-10).toLowerCase();
        return schedule.tsoName.toLowerCase().includes(q) || ref.includes(q);
      });
    }

    switch (sortBy) {
      case 'oldest':
        next.sort((a, b) => a.uploadedAtMs - b.uploadedAtMs);
        break;
      case 'highest':
        next.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'lowest':
        next.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      case 'pending-first':
        next.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          return b.uploadedAtMs - a.uploadedAtMs;
        });
        break;
      default:
        next.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
        break;
    }

    return next;
  }, [schedules, searchTerm, sortBy]);

  const totalSchedulePages = Math.max(1, Math.ceil(visibleSchedules.length / SCHEDULES_PAGE_SIZE));

  useEffect(() => {
    if (schedulePage <= totalSchedulePages) return;
    setSchedulePage(totalSchedulePages);
  }, [schedulePage, totalSchedulePages]);

  useEffect(() => {
    setSchedulePage(1);
  }, [searchTerm, sortBy]);

  const pagedSchedules = useMemo(() => {
    const start = (schedulePage - 1) * SCHEDULES_PAGE_SIZE;
    return visibleSchedules.slice(start, start + SCHEDULES_PAGE_SIZE);
  }, [schedulePage, visibleSchedules]);

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.scheduleId === selectedScheduleId),
    [schedules, selectedScheduleId],
  );

  const methodOptions = useMemo(() => {
    if (!selectedSchedule) return [] as Collection['method'][];
    return Array.from(new Set(selectedSchedule.collections.map((row) => row.method))).sort();
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedScheduleId) return;
    if (!selectedSchedule) {
      setSelectedScheduleId('');
    }
  }, [selectedSchedule, selectedScheduleId]);

  useEffect(() => {
    if (selectedScheduleId) return;
    if (pagedSchedules.length === 0) return;
    setSelectedScheduleId(pagedSchedules[0].scheduleId);
  }, [pagedSchedules, selectedScheduleId]);

  useEffect(() => {
    if (selectedMethod === 'all') return;
    if (methodOptions.includes(selectedMethod)) return;
    setSelectedMethod('all');
  }, [methodOptions, selectedMethod]);

  useEffect(() => {
    setSelectedMethod('all');
  }, [selectedScheduleId]);

  const selectedScheduleGroups = useMemo(() => {
    if (!selectedSchedule) return [] as Array<{ key: string; label: string; rows: EnrichedCollectionRow[] }>;
    const scopedRows = selectedMethod === 'all'
      ? selectedSchedule.collections
      : selectedSchedule.collections.filter((row) => row.method === selectedMethod);
    const sorted = [...scopedRows].sort((a, b) => toEpochMs(b.timestamp) - toEpochMs(a.timestamp));
    const grouped = new Map<string, EnrichedCollectionRow[]>();
    for (const row of sorted) {
      const ts = toEpochMs(row.timestamp);
      const key = toDayKey(ts);
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([key, rows]) => ({
        key,
        label: dayLabel(toEpochMs(rows[0].timestamp)),
        rows,
      }));
  }, [selectedMethod, selectedSchedule]);

  function escapeCsvTextCell(value: string | number): string {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');

    // Excel strips leading zeros for numeric-looking values unless forced to text.
    if (/^0\d+$/.test(text)) {
      return `="${escaped}"`;
    }

    return escapeCsv(text);
  }

  function handleExportScheduleCsv(schedule: CollectionSchedule) {
    const csv = [
      ['Account Number', 'Customer Name', 'TSO Name', 'Amount (NGN)', 'Method', 'Status', 'Date'].join(','),
      ...schedule.collections.map((row) => [
        escapeCsvTextCell(row.accountNumber),
        escapeCsv(row.customerName),
        escapeCsv(row.tsoName),
        escapeCsv(row.amount),
        escapeCsv(row.method),
        escapeCsv(row.status),
        escapeCsv(new Date(row.timestamp).toLocaleDateString('en-NG')),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `collection-schedule-${schedule.scheduleId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <h1 className={`${pageStyles.heading} ${styles.pageHeading}`}>Collection Schedules</h1>
      {error && <p className={pageStyles.error}>{error}</p>}

      <section className={styles.splitView}>
        <article className={styles.schedulePanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelControls}>
              <input
                className={styles.controlInput}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by TSO or schedule ref"
                aria-label="Search schedules"
              />
              <select
                className={styles.controlInput}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest' | 'pending-first')}
                aria-label="Sort schedules"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
                <option value="pending-first">Pending First</option>
              </select>
              <button className={pageStyles.btnSmall} type="button" onClick={() => void load()}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.scheduleCardList}>
              {[0, 1, 2, 3].map((idx) => (
                <article key={idx} className={`${styles.scheduleCard} ${styles.skeletonPulse}`}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                  <div className={`${styles.skeletonBlock} ${styles.skeletonTiny}`} />
                </article>
              ))}
            </div>
          ) : visibleSchedules.length === 0 ? (
            <div className={styles.emptyState}>No schedules found for this filter.</div>
          ) : (
            <div className={styles.scheduleCardList}>
              {pagedSchedules.map((r, idx) => (
                <article
                  key={r.scheduleId}
                  className={`${styles.scheduleCard} ${selectedScheduleId === r.scheduleId ? styles.scheduleCardActive : ''}`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                  onClick={() => setSelectedScheduleId(r.scheduleId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedScheduleId(r.scheduleId);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.scheduleMain}>
                    <div className={styles.scheduleLeft}>
                      <p className={styles.scheduleTitle}>{r.tsoName}</p>
                      <p className={styles.scheduleAmount}>₦{r.totalAmount.toLocaleString()}</p>
                      <p className={styles.scheduleSub}>{formatDateTime(r.uploadedAtMs)}</p>
                    </div>
                    <div className={styles.scheduleRight}>
                      <Badge value={r.status} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && visibleSchedules.length > 0 && (
            <div className={styles.paginationRow}>
              <button
                className={pageStyles.btnSmall}
                type="button"
                onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                disabled={schedulePage <= 1}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>Page {schedulePage} of {totalSchedulePages}</span>
              <button
                className={pageStyles.btnSmall}
                type="button"
                onClick={() => setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
                disabled={schedulePage >= totalSchedulePages}
              >
                Next
              </button>
            </div>
          )}
        </article>

        <section className={styles.detailShell}>
          {loading ? (
            <>
              <div className={`${styles.skeletonBlock} ${styles.skeletonLarge}`} />
              {[0, 1].map((idx) => (
                <div key={idx} className={`${styles.skeletonBlock} ${styles.skeletonMedium}`} />
              ))}
            </>
          ) : selectedSchedule ? (
            <>
              <div className={styles.detailHeading}>
                <div>
                  <p className={pageStyles.sectionTitle}>Schedule Items</p>
                  <p className={pageStyles.sectionSub}>
                    {selectedSchedule.tsoName} · {selectedSchedule.collections.length} collection{selectedSchedule.collections.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className={styles.detailActions}>
                  <select
                    className={styles.controlInput}
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value as 'all' | Collection['method'])}
                    aria-label="Filter by collection method"
                  >
                    <option value="all">All methods</option>
                    {methodOptions.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <button
                    className={pageStyles.btnSmall}
                    type="button"
                    onClick={() => handleExportScheduleCsv(selectedSchedule)}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              {selectedScheduleGroups.length === 0 ? (
                <div className={styles.emptyState}>No collections in this schedule.</div>
              ) : (
                selectedScheduleGroups.map((group, groupIndex) => (
                  <section key={group.key} className={styles.groupSection} style={{ animationDelay: `${groupIndex * 35}ms` }}>
                    <div className={styles.groupHeading}>{group.label}</div>
                    <div className={styles.groupList}>
                      {group.rows.map((r, rowIndex) => (
                        <article
                          key={r.collectionId}
                          className={styles.collectionCard}
                          style={{ animationDelay: `${rowIndex * 30}ms` }}
                        >
                          <div className={styles.collectionTop}>
                            <div>
                              <p className={styles.customerName}>{r.customerName}</p>
                              <p className={styles.mutedLine}>{r.tsoName} · {formatDateTime(toEpochMs(r.timestamp))}</p>
                            </div>
                            <div className={styles.collectionRight}>
                              <p className={styles.amount}>₦{r.amount.toLocaleString()}</p>
                              <Badge value={r.status} />
                            </div>
                          </div>
                          <div className={styles.collectionBottom}>
                            <span className={styles.accountNumber}>{r.accountNumber}</span>
                            <button
                              type="button"
                              className={pageStyles.btnSmall}
                              onClick={() => handleCopyAccount(r.accountNumber, r.collectionId)}
                              title="Copy account number"
                              aria-label="Copy account number"
                            >
                              {copiedRowId === r.collectionId ? 'Copied' : 'Copy Acct'}
                            </button>
                            <span className={styles.methodChip}>{r.method}</span>
                            {r.status === 'pending' && (
                              <span className={styles.actionRow}>
                                <button className={pageStyles.btnSuccess} onClick={() => handleConfirm(r.collectionId)}>
                                  Confirm
                                </button>
                                <button className={pageStyles.btnDanger} onClick={() => handleReject(r.collectionId)}>
                                  Reject
                                </button>
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </>
          ) : (
            <div className={styles.emptyState}>Select a schedule to review collections.</div>
          )}
        </section>
      </section>
    </div>
  );
}
