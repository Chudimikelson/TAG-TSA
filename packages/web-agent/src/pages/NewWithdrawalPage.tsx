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
    <Layout title="Withdrawal" className="withdrawal-form-shell">
      <div className="withdrawal-form">
        <h1>Withdrawal</h1>
        {success && <div className="success-msg">Request submitted! You can add another withdrawal.</div>}
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="withdrawal-form-field">
            <label htmlFor="accountSearch">Search Customer</label>
            <input
              id="accountSearch"
              type="search"
              placeholder="Search by customer name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedMemberId('');
                setSuccess(false);
              }}
              required
            />
          </div>

          {assignmentLoading && <div className="card-sub">Loading thrift savers…</div>}

          {!assignmentLoading && normalizedSearch && filteredAssignments.length === 0 && (
            <div className="error-msg">No thrift saver found for this search.</div>
          )}

          {!assignmentLoading && filteredAssignments.length > 0 && !selectedMemberId && (
            <div className="withdrawal-customer-options">
              {filteredAssignments.slice(0, 8).map(({ member }) => (
                <button
                  key={member.memberId}
                  type="button"
                  onClick={() => {
                    setSelectedMemberId(member.memberId);
                    setSearchTerm(member.name);
                  }}
                >
                  <strong>{member.name}</strong>
                  <span>{member.accountNumber ?? member.memberId}</span>
                </button>
              ))}
            </div>
          )}

          <div className="withdrawal-form-field">
            <label htmlFor="withdrawal-name">Name</label>
            <input id="withdrawal-name" type="text" value={matchedMember?.name ?? ''} placeholder="Selected customer" readOnly />
          </div>

          <div className="withdrawal-form-field withdrawal-amount-field">
            <label htmlFor="amount">Amount</label>
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

          <div className="withdrawal-form-actions">
            <button
              className="btn withdrawal-form-add"
              type="submit"
              disabled={loading || success || assignmentLoading}
            >
              {loading ? 'ADDING...' : 'ADD'}
            </button>
            <button
              className="btn withdrawal-form-done"
              type="button"
              onClick={() => navigate('/withdrawals')}
              disabled={loading}
            >
              DONE
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
