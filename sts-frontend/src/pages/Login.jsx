// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { getToken, persistTokens } from '../lib/auth';

const BRAND = 'EAZY_BYTZ';

export default function Login() {
  const auth = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    usernameOrEmail: '',
    remember: true,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validateUsername = (u) => !!u && u.trim().length >= 3 && !/\s/.test(u);

  useEffect(() => {
    if (auth?.isAuthed) {
      navigate(from, { replace: true });
    }
  }, [auth?.isAuthed, navigate, from]);

  function handleChange(e) {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  // Small helper for POSTing JSON with relative paths
  async function postJson(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || res.statusText || 'Request failed';
      const err = new Error(msg);
      err.payload = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Smooth wait for provider/token readiness to avoid redirect loops
  async function waitForAuth({ maxWaitMs = 2500, interval = 120 } = {}) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (getToken()) return true;
      if (auth?.isAuthed || auth?.user) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, interval));
    }
    return false;
  }

  // Try provider-first → fallback to direct POST
  async function performLogin(payload, remember) {
    if (typeof auth?.loginWithPassword === 'function') {
      try {
        const providerResp = await auth.loginWithPassword({ ...payload, remember });
        persistTokens(providerResp ?? {}); // normalize keys for downstream
        return { via: 'provider', resp: providerResp };
      } catch (err) {
        // fall through to direct POST
        // console.warn('Provider login failed, falling back:', err);
      }
    }
    const data = await postJson('/api/auth/login', payload);
    persistTokens(data);
    try {
      const access =
        data?.accessToken || data?.token || data?.access_token || (data?.data && (data.data.accessToken || data.data.token));
      if (access && typeof auth?.loginWithToken === 'function') {
        auth.loginWithToken(access, { persist: !!remember });
      } else if (typeof auth?.setAuth === 'function') {
        auth.setAuth(data);
      }
      if (typeof auth?.onLogin === 'function') auth.onLogin(data);
    } catch {}
    return { via: 'direct', resp: data };
  }

  // SIGN IN
  async function handleSignIn(e) {
    e.preventDefault();
    setServerError('');
    const newErr = {};
    if (!form.usernameOrEmail?.trim()) newErr.usernameOrEmail = 'Enter username or email';
    if (!form.password) newErr.password = 'Enter password';
    if (Object.keys(newErr).length) {
      setErrors(newErr);
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const payload = {
        usernameOrEmail: form.usernameOrEmail,
        email: form.usernameOrEmail,
        username: form.usernameOrEmail,
        password: form.password,
      };
      const result = await performLogin(payload, form.remember);
      await waitForAuth();

      setSuccessPulse(true);
      setTimeout(() => {
        setSuccessPulse(false);
        navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
      }, 380);
    } catch (err) {
      setServerError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // SIGN UP
  async function handleSignUp(e) {
    e.preventDefault();
    setServerError('');
    const newErr = {};
    if (!form.username?.trim()) newErr.username = 'Username is required';
    else if (!validateUsername(form.username)) newErr.username = 'Username must be ≥ 3 chars, no spaces';

    const email = (form.email || '').trim();
    if (!email) newErr.email = 'Email is required';
    else if (!validateEmail(email)) newErr.email = 'Invalid email';

    if (!form.password) newErr.password = 'Password is required';
    else if (form.password.length < 6) newErr.password = 'Password must be ≥ 6 chars';

    if (Object.keys(newErr).length) {
      setErrors(newErr);
      return;
    }

    setLoading(true);
    try {
      const payload = { username: form.username, email, password: form.password };
      const data = await postJson('/api/auth/register', payload);

      // If backend returns a token, log in immediately
      persistTokens(data);
      try {
        const token =
          data?.accessToken || data?.token || data?.access_token || (data?.data && (data.data.accessToken || data.data.token));
        if (token && typeof auth?.loginWithToken === 'function') auth.loginWithToken(token, { persist: true });
        if (typeof auth?.onLogin === 'function') auth.onLogin(data);
      } catch {}

      setSuccessPulse(true);
      setTimeout(() => {
        setSuccessPulse(false);
        navigate('/dashboard', { replace: true });
      }, 420);
    } catch (err) {
      setServerError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  function handleForgot() {
    alert('Password reset flow — wire your backend endpoint and call it here.');
  }

  // UI
  return (
    <>
      <style>{`
        :root {
          --bg1: #071026;
          --bg2: #08122a;
          --muted: rgba(229, 239, 255, 0.75);
          --ink: #eaf6ff;
          --ink-weak: rgba(234, 246, 255, 0.82);
          --primary1: #60a5fa;
          --primary2: #5eead4;
          --focus: rgba(96,165,250,0.9);
          --err: #ff6b6b;
          --line: rgba(255,255,255,0.08);
          --card: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
        }
        html, body, #root { height: 100%; }
        body {
          margin: 0;
          color: var(--ink);
          background:
            radial-gradient(900px 400px at 12% 8%, rgba(96,165,250,0.05), transparent 20%),
            radial-gradient(900px 500px at 88% 92%, rgba(94,234,212,0.04), transparent 18%),
            linear-gradient(180deg, var(--bg1), var(--bg2));
          -webkit-font-smoothing: antialiased;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        }

        .auth-shell {
          min-height: calc(100vh - 64px);
          width: 100%;
          display: grid;
          place-items: start center;
          padding: 40px 16px 64px;
          position: relative;
          overflow: hidden;
        }

        .auth-card {
          width: 100%;
          max-width: 520px;
          border-radius: 16px;
          padding: 22px 18px 20px;
          margin-top: 28px;
          background: var(--card);
          border: 1px solid var(--line);
          box-shadow: 0 18px 54px rgba(2, 6, 23, 0.62);
        }

        .brand {
          text-align: center;
          margin-bottom: 8px;
        }
        .brand h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.6px;
          background: linear-gradient(90deg, var(--primary1), var(--primary2));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .brand p {
          margin: 6px 0 0;
          font-size: 13px;
          color: var(--muted);
        }

        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--line);
          border-radius: 12px;
          margin: 14px 0 12px;
        }
        .tab {
          appearance: none;
          border: 1px solid transparent;
          border-radius: 10px;
          font-weight: 800;
          padding: 10px 12px;
          color: rgba(230,240,255,0.86);
          background: transparent;
          cursor: pointer;
        }
        .tab[aria-selected="true"] {
          color: #0b1222;
          background: linear-gradient(90deg, #bfe9ff, #b2fff0);
        }
        .tab:hover {
          border-color: rgba(147,197,253,0.4);
        }
        .tab:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus);
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 6px;
        }

        .field {
          position: relative;
          display: grid;
        }
        .input {
          width: 100%;
          padding: 18px 14px 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(10,16,26,0.38), rgba(10,16,26,0.28));
          color: var(--ink);
          font-size: 14px;
        }
        .input::placeholder { color: transparent; }
        .input:focus {
          outline: none;
          border-color: rgba(96,165,250,0.6);
          box-shadow: 0 0 0 2px rgba(96,165,250,0.18);
        }
        .label {
          position: absolute;
          left: 12px;
          top: 10px;
          font-size: 12px;
          color: var(--muted);
          transition: transform 140ms ease, font-size 140ms ease, top 140ms ease, color 140ms ease;
          padding: 0 4px;
          pointer-events: none;
          background: transparent;
        }
        .input:focus + .label,
        .input:not(:placeholder-shown) + .label {
          top: -8px;
          transform: translateY(-2px);
          font-size: 11px;
          color: #b8d4ff;
          background: rgba(7,16,38,0.7);
        }

        .password-wrap {
          position: relative;
        }
        .eye {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid transparent;
          background: rgba(255,255,255,0.04);
          color: var(--ink-weak);
          cursor: pointer;
        }
        .eye:hover { border-color: rgba(147,197,253,0.35); }
        .eye:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus); }

        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 2px;
        }
        .checkbox-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-size: 14px;
        }

        .forgot {
          display: inline-block;
          font-size: 13px;
          color: #cfe2ff;
          text-decoration: underline;
          margin-top: 2px;
        }
        .forgot:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--focus);
        }

        .cta {
          margin-top: 6px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          cursor: pointer;
          font-weight: 900;
          font-size: 14px;
          color: #071026;
          background: linear-gradient(90deg, #bfe9ff, #b2fff0);
          position: relative;
          box-shadow: 0 8px 28px rgba(8,16,30,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .cta[disabled] { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

        .pulse {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          width: 220px;
          height: 60px;
          border-radius: 14px;
          background: radial-gradient(circle, rgba(94,234,212,0.18), transparent 40%);
          animation: pulseAnim 420ms ease-out forwards;
          pointer-events: none;
          z-index: 3;
        }
        @keyframes pulseAnim {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          30% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.05); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }

        .server-error {
          margin-top: 6px;
          color: #ffb4b4;
          font-size: 13px;
        }
        .micro {
          text-align: center;
          color: var(--muted);
          font-size: 12px;
          margin-top: 12px;
        }

        @media (max-width: 620px) {
          .auth-card { padding: 18px 14px; border-radius: 12px; }
        }
      `}</style>

      <div className="auth-shell" role="presentation">
        <div className="auth-card" role="region" aria-label="Authentication">
          <div className="brand">
            <h1>{BRAND} TRADE-APP</h1>
            <p>Modern Stock Trading Simulator</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Sign in or sign up">
            <button
              role="tab"
              aria-selected={tab === 'signin'}
              className="tab"
              onClick={() => { setTab('signin'); setErrors({}); setServerError(''); }}
              type="button"
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={tab === 'signup'}
              className="tab"
              onClick={() => { setTab('signup'); setErrors({}); setServerError(''); }}
              type="button"
            >
              Sign Up
            </button>
          </div>

          {serverError ? (
            <div className="server-error" role="alert" aria-live="assertive">{serverError}</div>
          ) : null}

          {tab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate>
              <div className="field">
                <input
                  id="f-ue"
                  name="usernameOrEmail"
                  value={form.usernameOrEmail}
                  onChange={handleChange}
                  placeholder=" "
                  aria-label="Username or Email"
                  className="input"
                  autoComplete="username"
                />
                <label className="label" htmlFor="f-ue">Username or Email</label>
              </div>
              {errors.usernameOrEmail && <div className="server-error" role="alert">{errors.usernameOrEmail}</div>}

              <div className="field password-wrap">
                <input
                  id="f-pw"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder=" "
                  aria-label="Password"
                  className="input"
                  autoComplete="current-password"
                />
                <label className="label" htmlFor="f-pw">Password</label>
                <button type="button" className="eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <div className="server-error" role="alert">{errors.password}</div>}

              <div className="controls">
                <label className="checkbox-row">
                  <input name="remember" type="checkbox" checked={!!form.remember} onChange={handleChange} />
                  <span>Remember me</span>
                </label>
              </div>

              <a className="forgot" href="#" onClick={(e) => { e.preventDefault(); handleForgot(); }}>Forgot password?</a>

              <div style={{ position: 'relative' }}>
                {successPulse && <div className="pulse" aria-hidden />}
                <button type="submit" className="cta" disabled={loading} aria-live="polite">
                  {loading ? 'Signing in…' : '→  Sign In'}
                </button>
              </div>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignUp} noValidate>
              <div className="field">
                <input
                  id="s-un"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder=" "
                  aria-label="Username"
                  className="input"
                  autoComplete="username"
                />
                <label className="label" htmlFor="s-un">Username</label>
              </div>
              {errors.username && <div className="server-error" role="alert">{errors.username}</div>}

              <div className="field">
                <input
                  id="s-em"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder=" "
                  aria-label="Email"
                  className="input"
                  autoComplete="email"
                  type="email"
                />
                <label className="label" htmlFor="s-em">Email</label>
              </div>
              {errors.email && <div className="server-error" role="alert">{errors.email}</div>}

              <div className="field password-wrap">
                <input
                  id="s-pw"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder=" "
                  aria-label="Password"
                  className="input"
                  autoComplete="new-password"
                />
                <label className="label" htmlFor="s-pw">Password</label>
                <button type="button" className="eye" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <div className="server-error" role="alert">{errors.password}</div>}

              <button className="cta" type="submit" disabled={loading}>
                {loading ? 'Creating…' : '＋  Sign Up'}
              </button>
            </form>
          )}

          <div className="micro">{BRAND} TRADE-APP ⚡</div>
        </div>
      </div>
    </>
  );
}
