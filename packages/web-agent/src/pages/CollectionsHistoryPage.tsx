import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout.js';
import { createCollection, getAssignments, getCollections, type Assignment } from '../api/collections.js';
import type { Collection } from '@tagora/shared';
import { useAuth } from '../context/AuthContext.js';

type CollectionStatus = 'pending' | 'confirmed' | 'rejected' | 'matched' | 'flagged' | 'reconciled';

interface DraftCollection {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  accountNumber?: string;
  planId: string;
  amount: number;
  method: 'cash' | 'tsa' | 'tagora_pool';
}

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
  const [drafts, setDrafts] = useState<DraftCollection[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
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

  function handleAddDraft() {
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedAssignment) {
      setSubmitError('Select a customer to add.');
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

    const { member, activePlan } = selectedAssignment;
    setDrafts((prev) => [
      ...prev,
      {
        id: `${member.memberId}-${Date.now()}`,
        memberId: member.memberId,
        memberName: member.name,
        memberPhone: member.phone,
        accountNumber: member.accountNumber,
        planId: activePlan.planId,
        amount: amt,
        method,
      },
    ]);
    setAmount('');
    setSelectedMemberId('');
  }

  function handleRemoveDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSubmitDrafts() {
    if (!drafts.length) {
      setSubmitError('Add at least one collection before submitting.');
      return;
    }

    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    try {
      for (const draft of drafts) {
        await createCollection({
          memberId: draft.memberId,
          planId: draft.planId,
          amount: draft.amount,
          method: draft.method,
          idempotencyKey: `${draft.memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }

      const count = drafts.length;
      setDrafts([]);
      setSubmitSuccess(`${count} collection${count === 1 ? '' : 's'} submitted for CSM review.`);
      await loadCollections();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit collections.');
    } finally {
      setSubmitLoading(false);
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

      {drafts.length > 0 && (
        <div className="card static" style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Collections To Submit</div>
            <div className="card-sub">{drafts.length} item{drafts.length === 1 ? '' : 's'}</div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {drafts.map((draft) => (
              <div key={draft.id} className="collection-draft-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{draft.memberName}</div>
                  <div className="card-sub">
                    {draft.memberPhone ?? draft.accountNumber ?? draft.memberId}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    ₦{draft.amount.toLocaleString()}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => handleRemoveDraft(draft.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions" style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSubmitDrafts}
              disabled={submitLoading}
            >
              {submitLoading ? 'Submitting…' : 'Submit Collections'}
            </button>
          </div>
        </div>
      )}

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
              <button className="btn btn-primary" type="button" onClick={handleAddDraft}>Add</button>
              <button className="btn btn-outline" type="button" onClick={handleDone}>Done</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
