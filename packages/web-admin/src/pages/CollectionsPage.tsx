import { useEffect, useMemo, useState } from 'react';
import type { Collection } from '@tagora/shared';
import {
  confirmCollection,
  confirmCollectionsBulk,
  getCollections,
  rejectCollection,
  rejectCollectionsBulk,
} from '../api/collections.js';
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

const PAGE_SIZE = 20;

function toEpochMs(value: Date | string): number {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function toIsoDay(value: number): string {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CollectionsPage() {
  const [rows, setRows] = useState<EnrichedCollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedRowId, setCopiedRowId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTsoId, setSelectedTsoId] = useState<'all' | string>('all');
  const [selectedMethod, setSelectedMethod] = useState<'all' | Collection['method']>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'tso-asc' | 'tso-desc'>('newest');
  const [page, setPage] = useState(1);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

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
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const tsoOptions = useMemo(() => {
    const byId = new Map<string, string>();
    rows.forEach((row) => {
      byId.set(row.tsoId, row.tsoName);
    });

    return Array.from(byId.entries())
      .map(([tsoId, tsoName]) => ({ tsoId, tsoName }))
      .sort((a, b) => a.tsoName.localeCompare(b.tsoName));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      if (selectedTsoId !== 'all' && row.tsoId !== selectedTsoId) return false;
      if (selectedMethod !== 'all' && row.method !== selectedMethod) return false;
      if (selectedDate && toIsoDay(toEpochMs(row.timestamp)) !== selectedDate) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!q) return true;

      const searchable = [
        row.collectionId,
        row.customerName,
        row.accountNumber,
        row.tsoName,
        row.memberId,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [rows, searchTerm, selectedTsoId, selectedMethod, selectedDate, statusFilter]);

  const visibleRows = useMemo(() => {
    const next = [...filteredRows];

    switch (sortBy) {
      case 'oldest':
        next.sort((a, b) => toEpochMs(a.timestamp) - toEpochMs(b.timestamp));
        break;
      case 'highest':
        next.sort((a, b) => b.amount - a.amount);
        break;
      case 'lowest':
        next.sort((a, b) => a.amount - b.amount);
        break;
      case 'tso-asc':
        next.sort((a, b) => a.tsoName.localeCompare(b.tsoName));
        break;
      case 'tso-desc':
        next.sort((a, b) => b.tsoName.localeCompare(a.tsoName));
        break;
      default:
        next.sort((a, b) => toEpochMs(b.timestamp) - toEpochMs(a.timestamp));
        break;
    }

    return next;
  }, [filteredRows, sortBy]);

  const summary = useMemo(() => {
    const methodTotals = {
      cash: 0,
      tsa: 0,
      tagora_pool: 0,
    };

    const statusTotals = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
    };

    let totalAmount = 0;
    let newestTs = 0;
    let oldestTs = Number.MAX_SAFE_INTEGER;
    const byTso = new Map<string, { tsoName: string; count: number; amount: number }>();

    for (const row of visibleRows) {
      totalAmount += Number(row.amount) || 0;
      methodTotals[row.method] += Number(row.amount) || 0;

      if (row.status === 'pending' || row.status === 'confirmed' || row.status === 'rejected') {
        statusTotals[row.status] += 1;
      }

      const ts = toEpochMs(row.timestamp);
      if (ts > newestTs) newestTs = ts;
      if (ts < oldestTs) oldestTs = ts;

      const prev = byTso.get(row.tsoId) ?? { tsoName: row.tsoName, count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += Number(row.amount) || 0;
      byTso.set(row.tsoId, prev);
    }

    const topTsos = Array.from(byTso.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      count: visibleRows.length,
      totalAmount,
      statusTotals,
      methodTotals,
      newestTs,
      oldestTs: oldestTs === Number.MAX_SAFE_INTEGER ? 0 : oldestTs,
      topTsos,
    };
  }, [visibleRows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTsoId, selectedMethod, selectedDate, statusFilter, sortBy]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleRows.slice(start, start + PAGE_SIZE);
  }, [page, visibleRows]);

  useEffect(() => {
    const knownIds = new Set(rows.map((row) => row.collectionId));
    setSelectedCollectionIds((prev) => prev.filter((id) => knownIds.has(id)));
  }, [rows]);

  const pendingVisibleIds = useMemo(
    () => visibleRows.filter((row) => row.status === 'pending').map((row) => row.collectionId),
    [visibleRows],
  );

  const selectedPendingIds = useMemo(() => {
    const pendingSet = new Set(pendingVisibleIds);
    return selectedCollectionIds.filter((id) => pendingSet.has(id));
  }, [pendingVisibleIds, selectedCollectionIds]);

  const allPendingSelected = useMemo(() => {
    if (pendingVisibleIds.length === 0) return false;
    const selectedSet = new Set(selectedCollectionIds);
    return pendingVisibleIds.every((id) => selectedSet.has(id));
  }, [pendingVisibleIds, selectedCollectionIds]);

  async function handleConfirm(id: string) {
    try {
      await confirmCollection(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm collection');
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectCollection(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject collection');
    }
  }

  async function handleBulkConfirm() {
    if (selectedPendingIds.length === 0) {
      alert('Select at least one pending record to confirm.');
      return;
    }

    try {
      const result = await confirmCollectionsBulk(selectedPendingIds);
      await load();
      setSelectedCollectionIds([]);
      alert(`Confirmed ${result.data.processedCount} record${result.data.processedCount === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk confirm failed');
    }
  }

  async function handleBulkReject() {
    if (selectedPendingIds.length === 0) {
      alert('Select at least one pending record to reject.');
      return;
    }

    try {
      const result = await rejectCollectionsBulk(selectedPendingIds);
      await load();
      setSelectedCollectionIds([]);
      alert(`Rejected ${result.data.processedCount} record${result.data.processedCount === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk reject failed');
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

  function toggleCollectionSelection(collectionId: string) {
    setSelectedCollectionIds((prev) => (
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    ));
  }

  function toggleSelectAllPending() {
    if (allPendingSelected) {
      const pendingSet = new Set(pendingVisibleIds);
      setSelectedCollectionIds((prev) => prev.filter((id) => !pendingSet.has(id)));
      return;
    }

    setSelectedCollectionIds((prev) => Array.from(new Set([...prev, ...pendingVisibleIds])));
  }

  return (
    <div className={styles.page}>
      {error && <p className={pageStyles.error}>{error}</p>}

      <section className={styles.splitView}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelControls}>
          <input
            className={styles.controlInput}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, account, TSO or collection ID"
            aria-label="Search collection records"
          />

          <select
            className={styles.controlInput}
            value={selectedTsoId}
            onChange={(e) => setSelectedTsoId(e.target.value)}
            aria-label="Filter by TSO"
          >
            <option value="all">All TSOs</option>
            {tsoOptions.map((tso) => (
              <option key={tso.tsoId} value={tso.tsoId}>{tso.tsoName}</option>
            ))}
          </select>

          <select
            className={styles.controlInput}
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value as 'all' | Collection['method'])}
            aria-label="Filter by method"
          >
            <option value="all">All methods</option>
            <option value="cash">Cash</option>
            <option value="tsa">Transfer (TSA)</option>
            <option value="tagora_pool">Transfer (Tagora-Pool)</option>
          </select>

          <input
            className={styles.controlInput}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Filter by collection date"
          />

          <select
            className={styles.controlInput}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'confirmed' | 'rejected')}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className={styles.controlInput}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest' | 'tso-asc' | 'tso-desc')}
            aria-label="Sort records"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
            <option value="tso-asc">TSO (A-Z)</option>
            <option value="tso-desc">TSO (Z-A)</option>
          </select>

            <button className={pageStyles.btnSmall} type="button" onClick={() => void load()}>
              Refresh
            </button>
          </div>

          <div className={styles.bulkRow}>
            <label className={styles.bulkSelectLabel}>
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={toggleSelectAllPending}
                disabled={pendingVisibleIds.length === 0}
              />
              Select all pending ({pendingVisibleIds.length})
            </label>

            <span className={styles.bulkHint}>Selected pending: {selectedPendingIds.length}</span>

            <button
              className={pageStyles.btnSuccess}
              type="button"
              onClick={() => void handleBulkConfirm()}
              disabled={selectedPendingIds.length === 0}
            >
              Confirm Selected
            </button>

            <button
              className={pageStyles.btnDanger}
              type="button"
              onClick={() => void handleBulkReject()}
              disabled={selectedPendingIds.length === 0}
            >
              Reject Selected
            </button>
          </div>
          </div>
        {loading ? (
          <div className={styles.tableLoading}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className={styles.tableLoadingRow}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
              </div>
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className={styles.emptyState}>No collection records found for this filter.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colSelect}>Select</th>
                  <th>Customer</th>
                  <th className={styles.colAmount}>Amount</th>
                  <th>Method</th>
                  <th>TSO</th>
                  <th>Date/Time</th>
                  <th>Status</th>
                  <th className={styles.colActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.collectionId}>
                    <td>
                      {row.status === 'pending' ? (
                        <input
                          type="checkbox"
                          className={styles.rowSelectBox}
                          checked={selectedCollectionIds.includes(row.collectionId)}
                          onChange={() => toggleCollectionSelection(row.collectionId)}
                          aria-label={`Select collection for ${row.customerName}`}
                        />
                      ) : (
                        <span className={styles.selectSpacer} aria-hidden="true" />
                      )}
                    </td>

                    <td>
                      <div className={styles.customerCell}>
                        <p className={styles.customerName}>{row.customerName}</p>
                        <span className={styles.customerMeta}>
                          <span className={styles.rowSubtle}>{row.accountNumber}</span>
                          <button
                            type="button"
                            className={styles.copyIconBtn}
                            onClick={() => void handleCopyAccount(row.accountNumber, row.collectionId)}
                            title="Copy account number"
                            aria-label="Copy account number"
                          >
                            {copiedRowId === row.collectionId ? '✓' : '⧉'}
                          </button>
                        </span>
                      </div>
                    </td>

                    <td className={styles.colAmount}>
                      <span className={styles.amountValue}>₦{row.amount.toLocaleString()}</span>
                    </td>

                    <td>
                      <span className={styles.methodChip}>{row.method}</span>
                    </td>

                    <td>{row.tsoName}</td>

                    <td>
                      <span className={styles.rowSubtle}>{new Date(row.timestamp).toLocaleString('en-NG')}</span>
                    </td>

                    <td>
                      <Badge value={row.status} />
                    </td>

                    <td className={styles.colActions}>
                      {row.status === 'pending' ? (
                        <span className={styles.actionRow}>
                          <button className={pageStyles.btnSuccess} onClick={() => void handleConfirm(row.collectionId)}>
                            Confirm
                          </button>
                          <button className={pageStyles.btnDanger} onClick={() => void handleReject(row.collectionId)}>
                            Reject
                          </button>
                        </span>
                      ) : (
                        <span className={styles.rowSubtle}>No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && visibleRows.length > 0 && (
          <div className={styles.paginationRow}>
            <button
              className={pageStyles.btnSmall}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              className={pageStyles.btnSmall}
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
        </article>
      </section>
    </div>
  );
}
