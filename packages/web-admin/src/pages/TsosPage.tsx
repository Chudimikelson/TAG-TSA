import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge.js';
import { Table } from '../components/Table.js';
import { getTsos, TsoItem } from '../api/tsos.js';
import { getCollections } from '../api/collections.js';
import type { Collection } from '@tagora/shared';
import styles from './Page.module.css';

interface TsoPerformanceRow {
  tsoId: string;
  name: string;
  phone: string;
  status: 'active' | 'suspended';
  todayCollections: number;
  todayAmount: number;
  monthCollections: number;
  monthAmount: number;
  uniqueMembers: number;
}

function isOnOrAfter(dateValue: Date | string, threshold: Date): boolean {
  return new Date(dateValue).getTime() >= threshold.getTime();
}

export function TsosPage() {
  const [tsos, setTsos] = useState<TsoItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReport() {
    setLoading(true);
    setError('');
    try {
      const [tsoRes, collectionRes] = await Promise.all([getTsos(), getCollections()]);
      setTsos(tsoRes.data);
      setCollections(collectionRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TSO performance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const rows = useMemo<TsoPerformanceRow[]>(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const byTso = new Map<string, Collection[]>();
    for (const item of collections) {
      const group = byTso.get(item.tsoId) ?? [];
      group.push(item);
      byTso.set(item.tsoId, group);
    }

    return tsos
      .map((tso) => {
        const tsoCollections = byTso.get(tso.tsoId) ?? [];
        const today = tsoCollections.filter((c) => isOnOrAfter(c.timestamp, startOfToday));
        const month = tsoCollections.filter((c) => isOnOrAfter(c.timestamp, startOfMonth));

        return {
          tsoId: tso.tsoId,
          name: tso.name,
          phone: tso.phone,
          status: tso.status,
          todayCollections: today.length,
          todayAmount: today.reduce((sum, c) => sum + Number(c.amount || 0), 0),
          monthCollections: month.length,
          monthAmount: month.reduce((sum, c) => sum + Number(c.amount || 0), 0),
          uniqueMembers: new Set(month.map((c) => c.memberId)).size,
        };
      })
      .sort((a, b) => b.monthAmount - a.monthAmount);
  }, [collections, tsos]);

  const totals = useMemo(() => {
    return {
      totalTsos: rows.length,
      activeTsos: rows.filter((r) => r.status === 'active').length,
      todayAmount: rows.reduce((sum, r) => sum + r.todayAmount, 0),
      monthAmount: rows.reduce((sum, r) => sum + r.monthAmount, 0),
    };
  }, [rows]);

  return (
    <div>
      <h1 className={styles.heading}>TSO Performance Report</h1>

      <div className={styles.card}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: 16 }}>Summary</h2>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formGrid}>
          <div className={styles.label}>
            <span>Total TSOs</span>
            <strong>{totals.totalTsos}</strong>
          </div>
          <div className={styles.label}>
            <span>Active TSOs</span>
            <strong>{totals.activeTsos}</strong>
          </div>
          <div className={styles.label}>
            <span>Collections Today</span>
            <strong>NGN {totals.todayAmount.toLocaleString('en-NG')}</strong>
          </div>
          <div className={styles.label}>
            <span>Collections This Month</span>
            <strong>NGN {totals.monthAmount.toLocaleString('en-NG')}</strong>
          </div>
        </div>
      </div>

      <Table
        rows={rows}
        keyFn={(r) => r.tsoId}
        emptyMessage={loading ? 'Loading report...' : 'No TSOs yet.'}
        columns={[
          { header: 'Name', render: (r) => r.name },
          { header: 'Phone', render: (r) => r.phone },
          { header: 'Today Collections', render: (r) => r.todayCollections },
          {
            header: 'Today Amount',
            render: (r) => `NGN ${r.todayAmount.toLocaleString('en-NG')}`,
          },
          { header: 'Month Collections', render: (r) => r.monthCollections },
          {
            header: 'Month Amount',
            render: (r) => `NGN ${r.monthAmount.toLocaleString('en-NG')}`,
          },
          { header: 'Unique Savers (Month)', render: (r) => r.uniqueMembers },
          { header: 'Status', render: (r) => <Badge value={r.status} /> },
        ]}
      />
    </div>
  );
}
