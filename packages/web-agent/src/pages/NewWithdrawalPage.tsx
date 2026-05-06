import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { createWithdrawal } from '../api/withdrawals.js';

type DisbursementMethod = 'cash' | 'bank_transfer' | 'mobile_money';

const METHODS: { value: DisbursementMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export function NewWithdrawalPage() {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<DisbursementMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!memberId || !planId || !amt || amt <= 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createWithdrawal({ memberId, planId, amount: amt, disbursementMethod: method });
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
            <label className="field-label" htmlFor="memberId">Member ID</label>
            <input
              id="memberId"
              type="text"
              placeholder="MEM-…"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="planId">Plan ID</label>
            <input
              id="planId"
              type="text"
              placeholder="PLN-…"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
            />
          </div>

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

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || success}
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
