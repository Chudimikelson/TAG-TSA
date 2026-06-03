import { useEffect, useMemo, useState } from 'react';
import type { Collection } from '@tagora/shared';
import {
  getCollections,
} from '../api/collections.js';
import { getMembers } from '../api/members.js';
import { getTsos } from '../api/tsos.js';
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

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function methodLabel(method: Collection['method']): string {
  if (method === 'cash') return 'Cash';
  if (method === 'tsa') return 'Transfer (TSA)';
  return 'Transfer (Tagora-Pool)';
}

function toExcelXml(rows: EnrichedCollectionRow[]): string {
  const headers = [
    'Collection ID',
    'Customer Name',
    'Account Number',
    'Amount',
    'Method',
    'TSO',
    'Date/Time',
  ];

  const headerRow = `<Row>${headers
    .map((header) => `<Cell><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`)
    .join('')}</Row>`;

  const dataRows = rows.map((row) => {
    const cols = [
      { type: 'String', value: row.collectionId },
      { type: 'String', value: row.customerName },
      { type: 'String', value: row.accountNumber },
      { type: 'Number', value: String(row.amount) },
      { type: 'String', value: methodLabel(row.method) },
      { type: 'String', value: row.tsoName },
      { type: 'String', value: new Date(row.timestamp).toLocaleString('en-NG') },
    ];

    return `<Row>${cols
      .map((col) => `<Cell><Data ss:Type="${col.type}">${xmlEscape(col.value)}</Data></Cell>`)
      .join('')}</Row>`;
  });

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Collections">
    <Table>
      ${headerRow}
      ${dataRows.join('')}
    </Table>
  </Worksheet>
</Workbook>`;
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'tso-asc' | 'tso-desc'>('newest');
  const [page, setPage] = useState(1);

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
  }, [rows, searchTerm, selectedTsoId, selectedMethod, selectedDate]);

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

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedTsoId, selectedMethod, selectedDate, sortBy]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleRows.slice(start, start + PAGE_SIZE);
  }, [page, visibleRows]);


  async function handleCopyAccount(accountNumber: string, rowId: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedRowId(rowId);
      window.setTimeout(() => setCopiedRowId(''), 1200);
    } catch {
      alert('Unable to copy account number.');
    }
  }

  function handleExportExcel() {
    if (visibleRows.length === 0) {
      alert('No filtered records to export.');
      return;
    }

    const xml = toExcelXml(visibleRows);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `collections-filtered-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
            <span className={styles.bulkHint}>Filtered records: {visibleRows.length}</span>

            <button
              className={pageStyles.btnSmall}
              type="button"
              onClick={handleExportExcel}
              disabled={visibleRows.length === 0}
            >
              Export Excel
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
                  <th>Customer</th>
                  <th className={styles.colAmount}>Amount</th>
                  <th>Method</th>
                  <th>TSO</th>
                  <th>Date/Time</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.collectionId}>
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
