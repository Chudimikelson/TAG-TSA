import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { setTso } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(phone, password);
      setTso(result.tso, result.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page agent-login-page">
      <div className="auth-card agent-login-card">
        <div className="agent-login-welcome">Welcome</div>
        <div className="agent-login-brand" aria-label="Thrift Savings Mobile Application">
          <span>Thrift</span>
          <span>Savings</span>
          <span>Mobile</span>
          <span>Application</span>
        </div>
        <div className="auth-subtitle">Sign in to your TSO account</div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="phone">User ID</label>
            <input
              id="phone"
              type="tel"
              placeholder="+2348012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary btn-full agent-login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="agent-login-mark" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      </div>
    </div>
  );
}
