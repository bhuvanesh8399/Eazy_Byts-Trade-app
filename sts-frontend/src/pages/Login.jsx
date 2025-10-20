import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [status, setStatus] = useState({ loading: false, error: null });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });
    try {
      await login(form);
      nav(from, { replace: true });
    } catch (e2) {
      setStatus({ loading: false, error: e2.message || 'Login failed' });
      return;
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Login</h1>
      <form onSubmit={submit} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
        <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <label className="row" style={{ justifyContent: 'flex-start' }}>
          <input type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} />
          Remember me
        </label>
        <button disabled={status.loading}>{status.loading ? 'Signing in…' : 'Login'}</button>
        {status.error && <div className="badge err">{status.error}</div>}
      </form>
    </div>
  );
}
