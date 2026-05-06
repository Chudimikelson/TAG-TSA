import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout.js';
import { getCollections } from '../api/collections.js';
import type { Collection } from '@tagora/shared';

type CollectionStatus = 'pending' | 'matched' | 'flagged' | 'reconciled';

function statusBadge(status: string) {
  const s = status as CollectionStatus;
  const map: Record<CollectionStatus, string> = {
    pending: 'badge-pending',
    matched: 'badge-matched',
    flagged: 'badge-flagged',
    reconciled: 'badge-reconciled',
  };
  return `badge ${map[s] ?? 'badge-reconciled'}`;
}

export function CollectionsHistoryPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    getCollections()
      .then(setCollections)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <Layout title="Collections">
      {loading && <div className="spinner">Loading…</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && collections.length === 0 && (
        <div className="empty-state">No collections recorded yet.</div>
      )}

      {collections.map((c) => (
        <div key={c.collectionId} className="card static">
          <div className="row">
            <div className="card-amount">₦{Number(c.amount).toLocaleString()}</div>
            <span className={statusBadge(c.status)}>{c.status}</span>
          </div>
          <div className="card-sub" style={{ marginTop: 6 }}>
            {new Date(c.timestamp).toLocaleString()} · {c.method}
          </div>
        </div>
      ))}
    </Layout>
  );
}
