import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { createWithdrawal } from '../api/withdrawals.js';
import { getAssignments, type Assignment } from '../api/collections.js';
import { useAuth } from '../context/AuthContext.js';

type DisbursementMethod = 'cash' | 'bank_transfer' | 'mobile_money';

const METHODS: { value: DisbursementMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export function NewWithdrawalPage() {
  const { tso } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<DisbursementMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tso) {
      setAssignmentLoading(false);
      return;
    }

    void getAssignments(tso.tsoId)
      .then(setAssignments)
      .catch((err: Error) => setError(err.message))
      .finally(() => setAssignmentLoading(false));
  }, [tso]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAssignments = assignments.filter(({ member }) => {
    if (!normalizedSearch) return false;
    const account = (member.accountNumber ?? '').toLowerCase();
    const name = member.name.toLowerCase();
    return account.includes(normalizedSearch) || name.includes(normalizedSearch);
  });

  const matchedAssignment = selectedMemberId
    ? assignments.find(({ member }) => member.memberId === selectedMemberId)
    : filteredAssignments.length === 1
      ? filteredAssignments[0]
      : undefined;

  const matchedMember = matchedAssignment?.member;
  const matchedPlan = matchedAssignment?.activePlan;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!normalizedSearch || !amt || amt <= 0) {
      setError('Please provide account number or name and a valid amount.');
      return;
    }

    if (!matchedAssignment || !matchedMember) {
      setError('No thrift saver found for this account number.');
      return;
    }

    if (!matchedPlan) {
      setError('Selected thrift saver has no active plan.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await createWithdrawal({
        memberId: matchedMember.memberId,
        planId: matchedPlan.planId,
        amount: amt,
        disbursementMethod: method,
      });
      setSuccess(true);
      setTimeout(() => navigate('/withdrawals'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="New Withdrawal Request">
      {success && (
        <div className="success-msg">Request submitted! Redirecting…</div>
      )}
      {error && <div className="error-msg">{error}</div>}

      <div style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <div className="search-input-frame">
              <label className="search-input-legend" htmlFor="accountSearch">Search Customer</label>
              <input
                className="modern-search-input"
                id="accountSearch"
                type="text"
                placeholder="Search by customer name"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedMemberId('');
                }}
                required
              />
            </div>
          </div>

          {assignmentLoading && <div className="card-sub" style={{ marginBottom: 12 }}>Loading thrift savers…</div>}

          {!assignmentLoading && normalizedSearch && filteredAssignments.length === 0 && (
            <div className="error-msg">No thrift saver found for this search.</div>
          )}

          {!assignmentLoading && filteredAssignments.length > 1 && !matchedMember && (
            <div className="card static" style={{ marginBottom: 12 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Select Thrift Saver</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {filteredAssignments.slice(0, 8).map(({ member }) => (
                  <button
                    key={member.memberId}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => setSelectedMemberId(member.memberId)}
                  >
                    {member.name} - {member.accountNumber ?? member.memberId}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!assignmentLoading && matchedMember && (
            <div className="card static" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 4 }}>{matchedMember.name}</div>
              <div className="card-sub" style={{ marginBottom: 4 }}>
                Account: {matchedMember.accountNumber}
              </div>
              <div className="card-sub">
                Account Balance: ₦{Number(matchedMember.savingsBalance ?? 0).toLocaleString()}
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="amount">Amount (₦)</label>
            <input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <span className="section-label">Disbursement method</span>
            <div className="toggle-group">
              {METHODS.map((m) => (
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

          <div className="form-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || success || assignmentLoading}
            >
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => navigate('/withdrawals')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
