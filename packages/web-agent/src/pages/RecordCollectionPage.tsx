import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { createCollection, getAssignments, type Assignment } from '../api/collections.js';
import { useAuth } from '../context/AuthContext.js';

type CollectionMethod = 'cash' | 'transfer' | 'direct';

interface AddedCollection {
  id: string;
  memberName: string;
  memberId: string;
  amount: number;
  method: CollectionMethod;
  planId: string;
}

function getDraftStorageKey(tsoId?: string): string {
  return tsoId ? `tagora:collection-drafts:${tsoId}` : '';
}

export function RecordCollectionPage() {
  const navigate = useNavigate();
  const { tso } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CollectionMethod>('cash');
  const [addedCollections, setAddedCollections] = useState<AddedCollection[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<AddedCollection | null>(null);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  useEffect(() => {
    const key = getDraftStorageKey(tso?.tsoId);
    if (!key) return;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as AddedCollection[];
      if (Array.isArray(stored) && stored.length > 0) {
        setAddedCollections(stored);
        setShowSummary(true);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }, [tso?.tsoId]);

  useEffect(() => {
    const key = getDraftStorageKey(tso?.tsoId);
    if (!key) return;
    if (addedCollections.length === 0) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(addedCollections));
  }, [addedCollections, tso?.tsoId]);

  useEffect(() => {
    if (!tso) return;
    getAssignments(tso.tsoId)
      .then(setAssignments)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoadingCustomers(false));
  }, [tso]);

  const matchingAssignments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return [];
    return assignments.filter(({ member, activePlan }) =>
      Boolean(activePlan) && [member.name, member.memberId, member.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized) ?? false),
    ).slice(0, 6);
  }, [assignments, search]);

  const totals = useMemo(() => addedCollections.reduce(
    (summary, item) => {
      if (item.method === 'cash') summary.cash += item.amount;
      if (item.method === 'transfer') summary.transfer += item.amount;
      if (item.method === 'direct') summary.direct += item.amount;
      summary.total += item.amount;
      return summary;
    },
    { cash: 0, transfer: 0, direct: 0, total: 0 },
  ), [addedCollections]);

  function resetEntry() {
    setSearch('');
    setSelected(null);
    setAmount('');
    setMethod('cash');
    setEditingId(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected?.activePlan) {
      setError('Search for and select a customer first.');
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a whole number greater than zero.');
      return;
    }
    const nextItem: AddedCollection = {
      id: editingId ?? `${selected.member.memberId}-${Date.now()}`,
      memberName: selected.member.name,
      memberId: selected.member.memberId,
      amount: parsedAmount,
      method,
      planId: selected.activePlan.planId,
    };
    setAddedCollections((current) => editingId
      ? current.map((item) => item.id === editingId ? nextItem : item)
      : [...current, nextItem]);
    setError('');
    resetEntry();
  }

  async function handleBatchSubmit() {
    if (addedCollections.length === 0) {
      setError('Add at least one collection before submitting.');
      return;
    }
    setError('');
    setSubmittingBatch(true);
    try {
      for (const item of addedCollections) {
        await createCollection({
          planId: item.planId,
          memberId: item.memberId,
          amount: item.amount,
          method: item.method,
          idempotencyKey: item.id,
        });
      }
      setAddedCollections([]);
      setShowSummary(false);
      resetEntry();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit collections. Your records are saved for retry.');
    } finally {
      setSubmittingBatch(false);
    }
  }

  function editCollection(item: AddedCollection) {
    const assignment = assignments.find(({ member }) => member.memberId === item.memberId);
    if (assignment) setSelected(assignment);
    setSearch(item.memberName);
    setAmount(String(item.amount));
    setMethod(item.method);
    setEditingId(item.id);
    setShowSummary(false);
  }

  function removeCollection(id: string) {
    setAddedCollections((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetEntry();
    setPendingRemoval(null);
  }

  if (showSummary) {
    return (
      <Layout title="Summary" className="record-collection-shell">
        <div className="collection-summary-screen">
          <h1>Summary</h1>
          <div className="collection-summary-total">
            <div><span>Cash</span><strong>₦{totals.cash.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
            <div><span>Transfer</span><strong>₦{totals.transfer.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
            <div><span>Direct</span><strong>₦{totals.direct.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
            <hr />
            <div><span>Total</span><strong>₦{totals.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong></div>
          </div>
          <h2>Collection Details</h2>
          <div className="collection-summary-list">
            {addedCollections.map((item) => (
              <div className="collection-summary-item" key={item.id}>
                <div><strong>{item.memberName}</strong><span>₦{item.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
                <div>
                  <strong>{item.method === 'cash' ? 'Cash' : item.method === 'transfer' ? 'Transfer' : 'Direct'}</strong>
                  <div className="collection-summary-item-actions">
                    <button type="button" onClick={() => editCollection(item)}>Edit</button>
                    <button
                      type="button"
                      className="collection-summary-remove"
                      aria-label={`Remove ${item.memberName}`}
                      title="Remove collection"
                      onClick={() => setPendingRemoval(item)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {error && <div className="error-msg">{error}</div>}
          {pendingRemoval && (
            <div className="collection-remove-dialog-backdrop" role="presentation">
              <div className="collection-remove-dialog" role="alertdialog" aria-modal="true" aria-labelledby="remove-dialog-title">
                <h3 id="remove-dialog-title">Remove collection?</h3>
                <p>Remove the collection for {pendingRemoval.memberName}?</p>
                <div className="collection-remove-dialog-actions">
                  <button type="button" className="btn collection-remove-cancel" onClick={() => setPendingRemoval(null)}>
                    No
                  </button>
                  <button type="button" className="btn collection-remove-confirm" onClick={() => removeCollection(pendingRemoval.id)}>
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="collection-summary-actions">
            <button className="btn collection-summary-add" type="button" onClick={() => setShowSummary(false)}>
              Add
            </button>
            <button className="btn collection-summary-submit" type="button" onClick={handleBatchSubmit} disabled={submittingBatch}>
              {submittingBatch ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Record Collection" className="record-collection-shell">
      <div className="record-collection-form">
        <h1>Record Collection</h1>

        <div className="record-collection-field">
          <label htmlFor="customer-search">Search Customer</label>
          <input
            id="customer-search"
            type="search"
            value={selected ? selected.member.name : search}
            onChange={(event) => {
              setSelected(null);
              setSearch(event.target.value);
            }}
            placeholder="Type customer name"
            disabled={loadingCustomers}
          />
          {!selected && matchingAssignments.length > 0 && (
            <div className="customer-search-options">
              {matchingAssignments.map((assignment) => (
                <button
                  type="button"
                  key={assignment.member.memberId}
                  onClick={() => {
                    setSelected(assignment);
                    setSearch(assignment.member.name);
                    setError('');
                  }}
                >
                  <strong>{assignment.member.name}</strong>
                  <span>{assignment.member.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="record-collection-field">
          <label htmlFor="customer-name">Name</label>
          <input id="customer-name" type="text" value={selected?.member.name ?? ''} readOnly placeholder="Selected customer" />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="record-collection-field">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="record-collection-field">
            <label htmlFor="payment-method">Cash or Transfer</label>
            <select
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="direct">Direct</option>
            </select>
          </div>

          <div className="record-collection-actions">
            <button className="btn record-collection-add" type="submit">
              ADD
            </button>
            <button className="btn record-collection-done" type="button" onClick={() => setShowSummary(true)}>
              DONE
            </button>
          </div>
        </form>
      </div>

    </Layout>
  );
}
