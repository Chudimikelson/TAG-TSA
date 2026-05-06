import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOtp } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.js';

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTso } = useAuth();

  const phone = (location.state as { phone?: string } | null)?.phone ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code);
      setTso(result.tso, result.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">Enter OTP</div>
        <div className="auth-subtitle">
          A 6-digit code was sent to <strong>{phone}</strong>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="code">6-digit code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}
            onClick={() => navigate('/login')}
          >
            ← Back to login
          </button>
        </p>
      </div>
    </div>
  );
}
