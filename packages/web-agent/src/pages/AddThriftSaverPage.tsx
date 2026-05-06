import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { createMember, createPlan } from '../api/members.js';
import { ApiError } from '../api/client.js';

type Frequency = 'daily' | 'weekly' | 'monthly';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const PLAN_OPTIONS = ['Regular', 'Target', 'Special'] as const;

export function AddThriftSaverPage() {
  const navigate = useNavigate();

  // Member fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [address, setAddress] = useState('');
  const [nationalIdRef, setNationalIdRef] = useState('');

  // Plan fields
  const [planName, setPlanName] = useState<(typeof PLAN_OPTIONS)[number]>('Regular');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setErrorDetails([]);
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) {
      setError('Amount must be a whole number greater than zero.');
      return;
    }
    setLoading(true);
    try {
      // Step 1: register the member
      const member = await createMember({
        name,
        phone,
        email: email || undefined,
        accountNumber: accountNumber || undefined,
        address: address || undefined,
        nationalIdRef,
      });

      // Step 2: create their savings plan
      await createPlan(member.memberId, {
        name: planName,
        amount: amt,
        frequency,
        startDate,
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to add thrift saver');
        const details = err.details
          ? Object.entries(err.details).flatMap(([field, messages]) =>
              (messages ?? []).map((msg) => `${field}: ${msg}`),
            )
          : [];
        setErrorDetails(details);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add thrift saver');
        setErrorDetails([]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Add Thrift Saver">
      {success && (
        <div className="success-msg">
          Thrift saver registered successfully! Redirecting…
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
      {errorDetails.length > 0 && (
        <div className="error-msg">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errorDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        {/* ── Member details ── */}
        <p className="section-label" style={{ marginBottom: 12, fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
          Personal Details
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0 20px',
        }}>

        <div className="field">
          <label className="field-label" htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Amara Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            placeholder="+234…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="email">Email (optional)</label>
          <input
            id="email"
            type="email"
            placeholder="amara@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="accountNumber">Account number (optional)</label>
          <input
            id="accountNumber"
            type="text"
            placeholder="e.g. bank account or existing reference"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="address">Address (optional)</label>
          <input
            id="address"
            type="text"
            placeholder="e.g. 12 Market Road, Lagos"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="nationalId">National ID / BVN</label>
          <input
            id="nationalId"
            type="text"
            placeholder="NIN or BVN reference"
            value={nationalIdRef}
            onChange={(e) => setNationalIdRef(e.target.value)}
            required
          />
        </div>

        </div>{/* end grid */}

        {/* ── Savings plan ── */}
        <p className="section-label" style={{ margin: '20px 0 12px', fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
          Savings Plan
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0 20px',
        }}>

        <div className="field">
          <label className="field-label" htmlFor="planName">Plan name</label>
          <select
            id="planName"
            value={planName}
            onChange={(e) => setPlanName(e.target.value as (typeof PLAN_OPTIONS)[number])}
            required
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="amount">Amount per contribution (₦)</label>
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

        </div>{/* end plan grid */}

        <div className="field">
          <span className="section-label">Frequency</span>
          <div className="toggle-group">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`toggle-btn ${frequency === f.value ? 'active' : ''}`}
                onClick={() => setFrequency(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="startDate">Start date</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || success}
          >
            {loading ? 'Registering…' : 'Register Thrift Saver'}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Layout>
  );
}
