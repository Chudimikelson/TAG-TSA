import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { createCollection } from '../api/collections.js';
import type { Member, SavingsPlan } from '@tagora/shared';

interface LocationState {
  member: Member;
  activePlan: SavingsPlan | null;
}

export function RecordCollectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { member, activePlan } = (location.state as LocationState) ?? {};

  const [amount, setAmount] = useState(
    activePlan ? String(activePlan.amount) : '',
  );
  const [method, setMethod] = useState<'cash' | 'tsa' | 'tagora_pool'>('cash');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!member) {
    return (
      <Layout title="Record Collection">
        <div className="error-msg">No member selected. Please go back and choose a member.</div>
      </Layout>
    );
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activePlan) {
      setError('Member has no active plan.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) {
      setError('Amount must be a whole number greater than zero.');
      return;
    }
    setError('');
    setLoading(true);

    // Try to get GPS (optional)
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // location optional — continue without it
    }

    try {
      await createCollection({
        planId: activePlan.planId,
        memberId: member.memberId,
        amount: amt,
        method,
        idempotencyKey: `${member.memberId}-${Date.now()}`,
        lat,
        lng,
        photoFile: photoFile ?? undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record collection');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Record Collection">
      {/* Member header */}
      <div className="card static" style={{ marginBottom: 20 }}>
        <div className="card-title">{member.name}</div>
        <div className="card-sub">{member.phone}</div>
        {activePlan && (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {activePlan.name}
            </span>{' '}
            — ₦{activePlan.amount.toLocaleString()} / {activePlan.frequency}
          </div>
        )}
      </div>

      {success && (
        <div className="success-msg">Collection recorded! Returning to members…</div>
      )}
      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="amount">Amount (₦)</label>
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

        <div className="field">
          <span className="section-label">Payment method</span>
          <div className="toggle-group">
            {([
              { value: 'cash' as const, label: 'Cash' },
              { value: 'tsa' as const, label: 'Transfer (TSA)' },
              { value: 'tagora_pool' as const, label: 'Transfer (Tagora-Pool)' },
            ]).map((m) => (
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

        <div className="field">
          <span className="section-label">Receipt photo (optional)</span>
          {photoPreview ? (
            <div className="photo-preview">
              <img src={photoPreview} alt="Receipt preview" />
              <button
                type="button"
                style={{ marginTop: 8, fontSize: 13, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              >
                Remove photo
              </button>
            </div>
          ) : (
            <label
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1.5px dashed var(--primary)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              📎 Attach receipt
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhoto}
              />
            </label>
          )}
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || success}
          style={{ marginTop: 8, minWidth: 180 }}
        >
          {loading ? 'Recording…' : 'Record Collection'}
        </button>
      </form>
    </Layout>
  );
}
