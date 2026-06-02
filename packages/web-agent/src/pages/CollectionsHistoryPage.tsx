import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout.js';
import { createCollection, getAssignments, getCollections, type Assignment } from '../api/collections.js';
import type { Collection } from '@tagora/shared';
import { useAuth } from '../context/AuthContext.js';

type CollectionStatus = 'pending' | 'confirmed' | 'rejected' | 'matched' | 'flagged' | 'reconciled';

type CollectionStatusFilter = 'all' | 'pending' | 'confirmed' | 'rejected';
type CollectionMethodFilter = 'all' | 'cash' | 'tsa' | 'tagora_pool';

function statusBadge(status: string) {
  const s = status as CollectionStatus;
  const map: Record<CollectionStatus, string> = {
    pending: 'badge-pending',
    confirmed: 'badge-matched',
    rejected: 'badge-flagged',
    matched: 'badge-matched',
    flagged: 'badge-flagged',
    reconciled: 'badge-reconciled',
  };
  return `badge ${map[s] ?? 'badge-reconciled'}`;
}

export function CollectionsHistoryPage() {
  const { tso } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'tsa' | 'tagora_pool'>('cash');
  const [recordLoading, setRecordLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CollectionStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<CollectionMethodFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCollections() {
    setLoading(true);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
  }, []);

  useEffect(() => {
    if (!tso) return;
    getAssignments(tso.tsoId)
      .then(setAssignments)
      .catch((e: Error) => setError(e.message));
  }, [tso]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAssignments = useMemo(() => {
    if (!normalizedQuery) return assignments;
    return assignments.filter(({ member }) => {
      const searchable = [member.name, member.phone, member.accountNumber, member.memberId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [assignments, normalizedQuery]);

  const selectedAssignment = assignments.find(
    ({ member }) => member.memberId === selectedMemberId,
  );

  const memberById = useMemo(() => {
    const map = new Map<string, Assignment['member']>();
    assignments.forEach(({ member }) => {
      map.set(member.memberId, member);
    });
    return map;
  }, [assignments]);

  const planById = useMemo(() => {
    const map = new Map<string, Assignment['activePlan']>();
    assignments.forEach(({ activePlan }) => {
      if (activePlan) {
        map.set(activePlan.planId, activePlan);
      }
    });
    return map;
  }, [assignments]);

  const historyCollections = useMemo(
    () => [...collections].sort((a, b) => Number(new Date(b.timestamp)) - Number(new Date(a.timestamp))),
    [collections],
  );

  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredCollections = useMemo(() => {
    return historyCollections.filter((collection) => {
      if (statusFilter !== 'all' && collection.status !== statusFilter) {
        return false;
      }

      if (methodFilter !== 'all' && collection.method !== methodFilter) {
        return false;
      }

      if (!normalizedHistorySearch) {
        return true;
      }

      const member = memberById.get(collection.memberId);
      const searchable = [
        collection.collectionId,
        collection.memberId,
        member?.name,
        member?.phone,
        member?.accountNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedHistorySearch);
    });
  }, [historyCollections, memberById, methodFilter, normalizedHistorySearch, statusFilter]);

  const summaryCards = useMemo(() => {
    const todayKey = new Date().toDateString();
    let pendingCount = 0;
    let todayTotal = 0;
    let allTimeTotal = 0;

    collections.forEach((collection) => {
      allTimeTotal += Number(collection.amount) || 0;
      if (collection.status === 'pending') {
        pendingCount += 1;
      }
      if (new Date(collection.timestamp).toDateString() === todayKey) {
        todayTotal += Number(collection.amount) || 0;
      }
    });

    return [
      { label: 'Total Collections', value: collections.length.toLocaleString(), helper: 'All records' },
      { label: 'Pending Review', value: pendingCount.toLocaleString(), helper: 'Awaiting CSM action' },
      { label: 'Today Collected', value: `₦${todayTotal.toLocaleString()}`, helper: 'For today' },
      { label: 'All-time Value', value: `₦${allTimeTotal.toLocaleString()}`, helper: 'Sum of all uploads' },
    ];
  }, [collections]);

  function resetDialogFields() {
    setQuery('');
    setSelectedMemberId('');
    setAmount('');
    setMethod('cash');
  }

  function handleOpenDialog() {
    setSubmitError('');
    setSubmitSuccess('');
    setShowDialog(true);
  }

  function handleDone() {
    setShowDialog(false);
    resetDialogFields();
  }

  async function handleRecordCollection() {
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedAssignment) {
      setSubmitError('Select a customer to record collection for.');
      return;
    }
    if (!selectedAssignment.activePlan) {
      setSubmitError('Selected customer has no active plan.');
      return;
    }

    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) {
      setSubmitError('Amount must be a whole number greater than zero.');
      return;
    }

    try {
      setRecordLoading(true);
      await createCollection({
        memberId: selectedAssignment.member.memberId,
        planId: selectedAssignment.activePlan.planId,
        amount: amt,
        method,
        idempotencyKey: `${selectedAssignment.member.memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      setSubmitSuccess('Collection recorded and pending CSM confirmation.');
      setAmount('');
      setSelectedMemberId('');
      await loadCollections();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to record collection.');
    } finally {
      setRecordLoading(false);
    }
  }

  return (
    <Layout
      title="Collections"
      action={(
        <button className="btn btn-primary btn-sm" onClick={handleOpenDialog}>
          Record Collection
        </button>
      )}
      mobileAction={(
        <button className="mobile-record-btn" onClick={handleOpenDialog}>
          <span aria-hidden>+</span>
          <span aria-hidden>💵</span>
        </button>
      )}
    >
      {submitSuccess && <div className="success-msg">{submitSuccess}</div>}
      {submitError && <div className="error-msg">{submitError}</div>}

      <div className="collections-summary-grid" style={{ marginBottom: 14 }}>
        {summaryCards.map((card) => (
          <div key={card.label} className="card static collections-summary-card">
            <div className="collections-summary-label">{card.label}</div>
            <div className="collections-summary-value">{card.value}</div>
            <div className="card-sub">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="card static" style={{ marginBottom: 16 }}>
        <div className="collections-filters-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <div className="search-input-frame">
              <label className="search-input-legend" htmlFor="collections-history-search">Find Collection</label>
              <input
                className="modern-search-input"
                id="collections-history-search"
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by customer, phone, account or ID"
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="collections-status-filter">Status</label>
            <select
              id="collections-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CollectionStatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="collections-method-filter">Method</label>
            <select
              id="collections-method-filter"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as CollectionMethodFilter)}
            >
              <option value="all">All methods</option>
              <option value="cash">Cash</option>
              <option value="tsa">Transfer (TSA)</option>
              <option value="tagora_pool">Transfer (Tagora-Pool)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="spinner" aria-label="Loading" />}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && collections.length === 0 && (
        <div className="empty-state">No collections recorded yet.</div>
      )}

      {!loading && !error && collections.length > 0 && filteredCollections.length === 0 && (
        <div className="empty-state">No collections match your current filters.</div>
      )}

      {filteredCollections.map((c) => {
        const member = memberById.get(c.memberId);
        const plan = planById.get(c.planId);

        const methodLabel = c.method === 'cash'
          ? 'Cash'
          : c.method === 'tsa'
            ? 'Transfer (TSA)'
            : 'Transfer (Tagora-Pool)';

        return (
        <div key={c.collectionId} className="card static">
          <div className="collections-history-header">
            <div>
              <div className="card-title">{member?.name ?? c.memberId}</div>
              <div className="card-sub">
                {member?.accountNumber ?? c.memberId}
              </div>
            </div>
            <span className={statusBadge(c.status)}>{c.status}</span>
          </div>

          <div className="collections-history-metrics">
            <div className="card-amount">₦{Number(c.amount).toLocaleString()}</div>
            <div className="card-sub">
              {new Date(c.timestamp).toLocaleDateString()}
            </div>
          </div>

          <div className="collections-history-meta">
            <span className="badge badge-reconciled">{methodLabel}</span>
            {plan && (
              <span className="badge badge-reconciled">
                {plan.name} · ₦{Number(plan.amount).toLocaleString()} / {plan.frequency}
              </span>
            )}
          </div>
        </div>
      );})}

      {showDialog && (
        <div className="modal-overlay" onClick={handleDone}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ marginBottom: 10 }}>Record Collection</div>

            <div className="field">
              <div className="search-input-frame">
                <label className="search-input-legend" htmlFor="collection-search">Search Customer</label>
                <input
                  className="modern-search-input"
                  id="collection-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by customer name"
                />
              </div>
            </div>

            <div className="collection-search-results">
              {filteredAssignments.length === 0 && (
                <div className="card-sub">No customers match this search.</div>
              )}
              {filteredAssignments.slice(0, 8).map(({ member, activePlan }) => (
                <button
                  key={member.memberId}
                  type="button"
                  className={`collection-customer-btn ${selectedMemberId === member.memberId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMemberId(member.memberId);
                    if (!amount && activePlan) {
                      setAmount(String(activePlan.amount));
                    }
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{member.name}</span>
                  <span className="card-sub">{member.phone ?? member.accountNumber}</span>
                </button>
              ))}
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label" htmlFor="collection-amount">Amount</label>
              <input
                id="collection-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="field">
              <span className="section-label">Payment method</span>
              <div className="toggle-group">
                {([
                  { value: 'cash' as const, label: 'Cash' },
                  { value: 'tsa' as const, label: 'Transfer (TSA)' },
                  { value: 'tagora_pool' as const, label: 'Transfer (Tagora-Pool)' },
                ] as const).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`toggle-btn ${method === m.value ? 'active' : ''}`}
                    onClick={() => setMethod(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" type="button" onClick={() => void handleRecordCollection()} disabled={recordLoading}>
                {recordLoading ? 'Recording…' : 'Record'}
              </button>
              <button className="btn btn-outline" type="button" onClick={handleDone}>Done</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
