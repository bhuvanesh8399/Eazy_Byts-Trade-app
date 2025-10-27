// src/pages/Signup.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { persistTokens } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export default function Signup() {
  const { loginWithToken } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!username?.trim() || !password) {
      setErr('Username and password are required'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const text = await res.text().catch(() => '');
      let data; try { data = JSON.parse(text || '{}'); } catch { data = { message: text || res.statusText }; }
      if (!res.ok) throw new Error(data?.message || 'Signup failed');

      // If your backend returns a token, log in immediately:
      const token = data.accessToken || data.token || (data.data && data.data.accessToken);
      if (token) {
        persistTokens({ accessToken: token });
        if (typeof loginWithToken === 'function') loginWithToken(token);
        nav('/dashboard', { replace: true });
      } else {
        nav('/login', { replace: true });
      }
    } catch (ex) {
      setErr(ex.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-6" style={{ maxWidth: 560 }}>
      <h1>Create account</h1>
      {err && <p style={{ color: 'salmon' }}>{err}</p>}
      <form onSubmit={onSubmit} className="col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optional)" />
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Sign up'}</button>
      </form>
      <p className="mt-3">Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
