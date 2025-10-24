// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { getToken, persistTokens } from '../lib/auth';

/**
 * Robust Login.jsx (provider-first, fallback to direct POST)
 * - uses auth.loginWithPassword() if available (stores token)
 * - falls back to POST /api/auth/login and then auth.loginWithToken(token) or setAuth
 * - writes common token keys to localStorage for downstream compatibility
 * - waits briefly for provider/token before navigation to avoid redirect loops
 * - uses RELATIVE paths (/api/...) so Vite proxy handles dev
 */

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
    remember: true
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
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  async function postJson(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || data?.error || res.statusText || 'Request failed';
      const err = new Error(message);
      err.payload = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function waitForAuth({ maxWaitMs = 3000, interval = 150 } = {}) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (getToken()) return true;
      if (auth?.isAuthed || auth?.user) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, interval));
    }
    return false;
  }

  // Try provider-first → fallback to direct POST
  async function performLogin(payload) {
    // 1) Preferred: provider method (persists token itself)
    if (typeof auth?.loginWithPassword === 'function') {
      try {
        const providerResp = await auth.loginWithPassword(payload);
        // ensure common keys are present (harmless if already set)
        persistTokens(providerResp ?? {});
        return { via: 'provider', resp: providerResp };
      } catch (err) {
        // proceed to fallback
        console.warn('Provider loginWithPassword failed, falling back:', err);
      }
    }

    // 2) Fallback: direct POST and push token into provider
    const data = await postJson('/api/auth/login', payload);
    const access =
      data?.accessToken || data?.token || data?.access_token || (data?.data && (data.data.accessToken || data.data.token)) || null;

    persistTokens(data);

    try {
      if (access && typeof auth?.loginWithToken === 'function') {
        auth.loginWithToken(access);
      } else if (typeof auth?.setAuth === 'function') {
        auth.setAuth(data);
      }
      if (typeof auth?.onLogin === 'function') {
        auth.onLogin(data);
      }
    } catch (e) {
      console.warn('Provider sync after POST threw:', e);
    }

    return { via: 'direct', resp: data };
  }

  // SIGN IN
  async function handleSignIn(e) {
    e.preventDefault();
    setServerError('');
    const newErr = {};
    if (!form.usernameOrEmail?.trim()) newErr.usernameOrEmail = 'Enter username or email';
    if (!form.password) newErr.password = 'Enter password';
    if (Object.keys(newErr).length) { setErrors(newErr); return; }
    if (loading) return;

    setLoading(true);
    try {
      const payload = {
        usernameOrEmail: form.usernameOrEmail,
        email: form.usernameOrEmail,
        username: form.usernameOrEmail,
        password: form.password,
        remember: form.remember
      };

      const result = await performLogin(payload);

      // wait for provider/token
      await waitForAuth({ maxWaitMs: 3000 });

      // success pulse then navigate
      setSuccessPulse(true);
      setTimeout(() => {
        setSuccessPulse(false);
        navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
      }, 420);
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
    else if (!validateUsername(form.username)) newErr.username = 'Username must be ≥3 chars, no spaces';

    const email = (form.email || '').trim();
    if (!email) newErr.email = 'Email is required';
    else if (!validateEmail(email)) newErr.email = 'Invalid email';
    else if (!email.toLowerCase().endsWith('@gmail.com')) newErr.email = 'Use a @gmail.com email';

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

      // If backend returns a token, immediately log in
      const token =
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        (data?.data && (data.data.accessToken || data.data.token)) ||
        null;

      if (token && typeof auth?.loginWithToken === 'function') {
        auth.loginWithToken(token);
      }
      // Persist common names anyway
      persistTokens(data);

      setSuccessPulse(true);
      setTimeout(() => {
        setSuccessPulse(false);
        navigate('/dashboard', { replace: true });
      }, 480);
    } catch (err) {
      setServerError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  function handleForgot() {
    alert('Password reset flow — wire your backend endpoint and call it here.');
  }

  // Render (full UI preserved)
  return (
    <>
      <style>{`
        :root {
          --bg1: #071026;
          --bg2: #08122a;
          --neon1: #60a5fa;
          --neon2: #5eead4;
          --muted: rgba(255,255,255,0.72);
          --err: #ff6b6b;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial;background:
          radial-gradient(800px 400px at 10% 10%, rgba(96,165,250,0.03), transparent 8%),
          radial-gradient(900px 500px at 90% 90%, rgba(94,234,212,0.02), transparent 6%),
          linear-gradient(180deg,var(--bg1),var(--bg2));
          color:#eaf6ff;-webkit-font-smoothing:antialiased}

        .auth-shell { min-height:100vh; width:100%; display:grid; place-items:center; padding:28px; position:relative; overflow:hidden }

        .grid-bg { position:absolute; inset:-30%; background-image:
            linear-gradient(transparent 24px, rgba(255,255,255,0.01) 25px),
            linear-gradient(90deg, transparent 24px, rgba(255,255,255,0.01) 25px);
          background-size:48px 48px; transform:rotate(-8deg) scale(1.6); opacity:0.03; filter:blur(6px); pointer-events:none; animation: drift 20s linear infinite }
        @keyframes drift { from { transform:rotate(-8deg) translateY(0) scale(1.6) } to { transform:rotate(-8deg) translateY(-70px) scale(1.6) } }

        .card {
          width:100%; max-width:520px; border-radius:16px; padding:28px; position:relative; overflow:hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          box-shadow: 0 22px 72px rgba(2,6,23,0.72); border:1px solid rgba(255,255,255,0.04);
        }
        .card::before {
          content:""; position:absolute; left:-40%; right:-40%; top:-40%; height:240px;
          background: conic-gradient(from 180deg at 50% 50%, rgba(96,165,250,0.06), rgba(94,234,212,0.05));
          transform:skewY(-8deg); filter:blur(28px); opacity:0.5; pointer-events:none;
        }

        .brand { text-align:center; margin-bottom:12px }
        .brand h1 { margin:0; font-size:20px; font-weight:800; letter-spacing:1px; background:linear-gradient(90deg,var(--neon1),var(--neon2)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent }
        .brand p { margin:6px 0 0; color:var(--muted); font-size:13px }

        .tabs { display:flex; gap:8px; margin:16px 0 18px; background:rgba(255,255,255,0.02); padding:6px; border-radius:12px }
        .tab { flex:1; padding:10px 12px; border-radius:8px; cursor:pointer; font-weight:700; color:rgba(230,240,255,0.75); text-align:center; transition:transform 140ms ease }
        .tab:hover { transform: translateY(-3px) }
        .tab.active { background: linear-gradient(90deg, rgba(96,165,250,0.12), rgba(94,234,212,0.08)); color:#fff; box-shadow:0 8px 22px rgba(11,22,40,0.45) }

        form { display:flex; flex-direction:column; gap:12px; margin-top:6px }
        label { display:block; position:relative }
        .input { width:100%; padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:linear-gradient(180deg, rgba(10,16,26,0.34), rgba(10,16,26,0.26)); color:#eaf6ff; outline:none; transition: box-shadow 140ms ease, border-color 140ms ease, transform 140ms ease; font-size:14px }
        .input:focus { box-shadow: 0 10px 30px rgba(8,16,30,0.6); border-color: rgba(96,165,250,0.6); transform: translateY(-2px) }
        .input.err { border-color: var(--err); box-shadow:none; transform:none }

        .field-error { color: var(--err); font-size:12px; margin-top:6px }
        .field-note { font-size:12px; color:var(--muted); margin-top:6px }

        .password-wrap { position:relative }
        .eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:transparent; border:none; cursor:pointer; font-size:16px; color: rgba(230,240,255,0.7) }

        .controls { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:6px }
        .checkbox-row { display:flex; gap:8px; align-items:center; color:var(--muted); font-size:14px }
        .link { background:none; border:none; color:#9fbfff; text-decoration:underline; cursor:pointer; font-size:13px; padding:0 }

        .cta {
          margin-top:8px; width:100%; padding:12px 14px; border-radius:12px; border:none; cursor:pointer; font-weight:800; font-size:14px; color:#071026;
          background: linear-gradient(90deg,#bfe9ff,#b2fff0); position:relative; overflow:hidden; transition: transform 160ms ease, box-shadow 160ms ease; box-shadow: 0 8px 28px rgba(8,16,30,0.5);
          display:flex; align-items:center; justify-content:center; gap:10px;
        }
        .cta:active { transform: translateY(1px) }
        .cta[disabled] { opacity:0.6; cursor:not-allowed; transform:none; box-shadow:none }

        .spinner { width:18px;height:18px;border-radius:50%;border:2px solid rgba(7,16,38,0.2); border-top-color:#071026; animation:spin 800ms linear infinite; box-sizing:border-box }
        @keyframes spin { to { transform: rotate(360deg) } }

        .pulse {
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(0.8); width:220px; height:60px; border-radius:14px;
          background: radial-gradient(circle, rgba(94,234,212,0.14), transparent 40%); animation: pulseAnim 420ms ease-out forwards; pointer-events:none; z-index:3;
        }
        @keyframes pulseAnim { 0% { opacity:0; transform:translate(-50%,-50%) scale(0.6) } 30% { opacity:0.9; transform:translate(-50%,-50%) scale(1.05) } 100% { opacity:0; transform:translate(-50%,-50%) scale(1.6) } }

        .server-error { color:#ffb4b4; font-size:13px; text-align:center; margin-top:6px }
        .micro { text-align:center; color:var(--muted); font-size:12px; margin-top:10px }

        @media (max-width:620px) { .card { padding:18px; margin:0 8px; border-radius:12px } }
      `}</style>

      <div className="auth-shell" role="presentation">
        <div className="grid-bg" aria-hidden />

        <div className="card" role="region" aria-label="Authentication">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div className={`brand`}>
              <h1 className={`header-glow ${successPulse ? 'affirm' : ''}`}>EAZY_BYTZ TRADE-APP</h1>
              <p>Modern Stock Trading Simulator</p>
            </div>
          </div>

          <nav className="tabs" role="tablist" aria-label="Sign in or sign up">
            <button
              role="tab"
              aria-selected={tab === 'signin'}
              className={`tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => { setTab('signin'); setErrors({}); setServerError(''); }}
              type="button"
            >
              Sign In
            </button>

            <button
              role="tab"
              aria-selected={tab === 'signup'}
              className={`tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setErrors({}); setServerError(''); }}
              type="button"
            >
              Sign Up
            </button>
          </nav>

          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          {/* SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate>
              <label>
                <input
                  name="usernameOrEmail"
                  value={form.usernameOrEmail}
                  onChange={handleChange}
                  placeholder="Username or Email"
                  aria-label="Username or Email"
                  className={`input ${errors.usernameOrEmail ? 'err' : ''}`}
                  autoComplete="username"
                />
                {errors.usernameOrEmail && <div className="field-error">{errors.usernameOrEmail}</div>}
              </label>

              <label>
                <div className="password-wrap">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    aria-label="Password"
                    className={`input ${errors.password ? 'err' : ''}`}
                    autoComplete="current-password"
                  />
                  <button type="button" className="eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(s => !s)}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && <div className="field-error">{errors.password}</div>}
              </label>

              <div className="controls">
                <label className="checkbox-row">
                  <input name="remember" type="checkbox" checked={!!form.remember} onChange={handleChange} />
                  <span>Remember me</span>
                </label>

                <button type="button" className="link" onClick={handleForgot}>Forgot password?</button>
              </div>

              <div style={{ position: 'relative' }}>
                {successPulse && <div className="pulse" aria-hidden />}

                <button type="submit" className="cta" disabled={loading} aria-live="polite">
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M2 12h20" stroke="#071026" strokeWidth="2" strokeLinecap="round"></path>
                        <path d="M16 6l6 6-6 6" stroke="#071026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      Sign In
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* SIGN UP */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} noValidate>
              <label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  aria-label="Username"
                  className={`input ${errors.username ? 'err' : ''}`}
                  autoComplete="username"
                />
                {errors.username && <div className="field-error">{errors.username}</div>}
              </label>

              <label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email (must be @gmail.com)"
                  aria-label="Email"
                  className={`input ${errors.email ? 'err' : ''}`}
                  autoComplete="email"
                  type="email"
                />
                {errors.email && <div className="field-error">{errors.email}</div>}
              </label>

              <label>
                <div className="password-wrap">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    aria-label="Password"
                    className={`input ${errors.password ? 'err' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" className="eye" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && <div className="field-error">{errors.password}</div>}
              </label>

              <div className="controls" style={{ justifyContent: 'flex-start' }}>
                <label className="checkbox-row">
                  <input name="remember" type="checkbox" checked={!!form.remember} onChange={handleChange} />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <button className="cta" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden />
                    Creating account...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 5v14M5 12h14" stroke="#071026" strokeWidth="2" strokeLinecap="round"></path>
                    </svg>
                    Sign Up
                  </>
                )}
              </button>
            </form>
          )}

          <div className="micro"> BHUVANESH EAZY BYTS TRADE APP ⚡</div>
        </div>
      </div>
    </>
  );
}
