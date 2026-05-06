import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../api/auth.js';
import { markAuthenticated } from '../context/AuthContext.js';
import styles from './LoginPage.module.css';

type Step = 'phone' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyOtp(phone, code);
      markAuthenticated();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp}>
            <h1>Sign in</h1>
            <p>Enter your registered phone number to receive a one-time PIN.</p>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+2348012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <button className={styles.btn} disabled={busy} type="submit">
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <h1>Enter OTP</h1>
            <p>A 6-digit code was sent to {phone}.</p>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label htmlFor="code">One-time PIN</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button className={styles.btn} disabled={busy} type="submit">
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <div className={styles.link}>
              <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
                Use a different number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
