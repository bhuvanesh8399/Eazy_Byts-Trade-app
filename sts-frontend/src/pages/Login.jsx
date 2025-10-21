import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const auth = useAuth() || {};
  const { login: authLogin, signup: authSignup, register: authRegister, setAuth, onLogin } = auth;

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    usernameOrEmail: '',
    password: '',
    confirmPassword: '',
    remember: true
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const API_BASE = 'http://localhost:8080';

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isGmail = (e) => e?.toLowerCase().endsWith('@gmail.com');

  const handleChange = (ev) => {
    const { name, type, checked, value } = ev.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  async function postJson(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || data?.error || res.statusText || 'Request failed';
      const err = new Error(message);
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function handleAuthSuccess(responseData) {
    // Prefer provider hooks if present
    if (typeof authLogin === 'function') { try { await authLogin(responseData); return; } catch {} }
    if (typeof authSignup === 'function') { try { await authSignup(responseData); return; } catch {} }
    if (typeof authRegister === 'function') { try { await authRegister(responseData); return; } catch {} }
    if (typeof setAuth === 'function') { try { setAuth(responseData); return; } catch {} }
    if (typeof onLogin === 'function') { try { onLogin(responseData); return; } catch {} }

    // Fallback: store tokens (shape from backend: { accessToken, refreshToken })
    if (responseData?.accessToken) {
      try {
        localStorage.setItem('accessToken', responseData.accessToken);
        if (responseData.refreshToken) localStorage.setItem('refreshToken', responseData.refreshToken);
      } catch {}
    } else {
      try { localStorage.setItem('auth', JSON.stringify(responseData)); } catch {}
    }
  }

  // Sign In
  const handleSignIn = async (ev) => {
    ev.preventDefault();
    setServerError('');
    const newErr = {};
    const identifier = (form.usernameOrEmail || form.email || '').trim();
    if (!identifier) newErr.usernameOrEmail = 'Enter username or email';
    if (!form.password) newErr.password = 'Enter password';
    else if (form.password.length < 6) newErr.password = 'Password must be ≥ 6 chars';
    if (Object.keys(newErr).length) { setErrors(newErr); return; }

    setLoading(true);
    try {
      const payload = {
        usernameOrEmail: form.usernameOrEmail || form.email,
        password: form.password
      };
      const data = await postJson('/api/auth/login', payload);
      await handleAuthSuccess(data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up (→ /api/auth/register and expects username, email, password)
  const handleSignUp = async (ev) => {
    ev.preventDefault();
    setServerError('');
    const newErr = {};
    if (!form.username?.trim()) newErr.username = 'Username is required';
    if (!form.email?.trim()) newErr.email = 'Email is required';
    else if (!validateEmail(form.email)) newErr.email = 'Invalid email';
    else if (!isGmail(form.email)) newErr.email = 'Only @gmail.com emails allowed';
    if (!form.password) newErr.password = 'Password is required';
    else if (form.password.length < 6) newErr.password = 'Password must be ≥ 6 chars';
    if (!form.confirmPassword) newErr.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) newErr.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErr).length) { setErrors(newErr); return; }

    setLoading(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password
      };
      const data = await postJson('/api/auth/register', payload);
      await handleAuthSuccess(data);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    alert('Password reset flow — wire your backend endpoint and call it from here.');
  };

  return (
    <>
      <style>{`
        :root{
          --bg-1: #071026; --bg-2: #091028; --glass: rgba(255,255,255,0.03);
          --neon-a: #5eead4; --neon-b: #60a5fa; --muted: rgba(255,255,255,0.6); --err: #ff6b6b;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;background:
          radial-gradient(1200px 600px at 10% 10%, rgba(96,165,250,0.03), transparent 6%),
          radial-gradient(900px 500px at 90% 90%, rgba(94,234,212,0.02), transparent 6%),
          linear-gradient(180deg,var(--bg-1),var(--bg-2));color:#eaf6ff;-webkit-font-smoothing:antialiased}
        .login-shell{min-height:100vh;width:100%;display:grid;place-items:center;padding:28px;position:relative;overflow:hidden}
        .grid-pattern{position:absolute;inset:-20%;background-image:
          linear-gradient(transparent 24px, rgba(255,255,255,0.02) 25px),
          linear-gradient(90deg, transparent 24px, rgba(255,255,255,0.02) 25px);background-size:50px 50px,50px 50px;transform:rotate(-6deg) scale(1.8);opacity:0.03;filter:blur(6px);pointer-events:none;animation:drift 20s linear infinite}
        @keyframes drift{from{transform:rotate(-6deg) translateY(0) scale(1.8)}to{transform:rotate(-6deg) translateY(-60px) scale(1.8)}}
        .glow-lines{position:absolute;inset:0;background:
          radial-gradient(circle at 10% 10%, rgba(96,165,250,0.02), transparent 3%),
          radial-gradient(circle at 90% 90%, rgba(94,234,212,0.02), transparent 4%);pointer-events:none}
        .card{position:relative;width:100%;max-width:520px;border-radius:16px;padding:32px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.04);box-shadow:0 8px 40px rgba(2,8,23,0.7),0 1px 0 rgba(255,255,255,0.02) inset;backdrop-filter:blur(8px) saturate(120%)}
        .card::before{content:"";position:absolute;left:-50%;right:-50%;top:-6px;height:160px;background:conic-gradient(from 180deg at 50% 50%, rgba(96,165,250,0.06), rgba(94,234,212,0.05));transform:skewY(-6deg);filter:blur(18px);opacity:0.6;pointer-events:none}
        .brand{text-align:center;margin-bottom:8px}
        .brand h1{font-size:18px;margin:0;letter-spacing:0.8px;background:linear-gradient(90deg,var(--neon-b),var(--neon-a));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}
        .brand p{margin:6px 0 18px;font-size:13px;color:var(--muted)}
        .tabs{display:flex;gap:10px;margin-bottom:18px;background:rgba(255,255,255,0.02);padding:6px;border-radius:12px;align-items:center}
        .tab{flex:1;padding:10px 12px;border-radius:8px;text-align:center;cursor:pointer;font-weight:600;color:rgba(230,240,255,0.75);border:1px solid transparent;transition:all 160ms cubic-bezier(.2,.9,.2,1)}
        .tab:hover{transform:translateY(-2px)}
        .tab.active{background:linear-gradient(90deg, rgba(96,165,250,0.12), rgba(94,234,212,0.08));box-shadow:0 6px 18px rgba(11,22,40,0.5),0 0 18px rgba(96,165,250,0.06) inset;color:#fff;border-color:rgba(96,165,250,0.18)}
        form{display:flex;flex-direction:column;gap:12px;margin-top:2px}
        label{display:block;position:relative}
        .input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:linear-gradient(180deg, rgba(10,16,26,0.34), rgba(10,16,26,0.26));color:#eaf6ff;outline:none;font-size:14px;transition:box-shadow 140ms ease,border-color 140ms ease,transform 140ms ease}
        .input:focus{box-shadow:0 10px 30px rgba(8,16,30,0.6);border-color:rgba(96,165,250,0.6);transform:translateY(-2px)}
        .input.err{border-color:var(--err);box-shadow:none;transform:none}
        .field-note{font-size:12px;color:var(--muted);margin-top:6px}
        .password-wrap{position:relative}
        .eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;font-size:16px;color:rgba(230,240,255,0.7)}
        .controls{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:2px}
        .checkbox-row{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:14px}
        .link{background:none;border:none;color:#9fbfff;text-decoration:underline;cursor:pointer;font-size:13px;padding:0}
        .btn{width:100%;padding:12px 14px;border-radius:12px;border:none;font-weight:700;cursor:pointer;color:#071026;background:linear-gradient(90deg,#bfe9ff,#b2fff0);box-shadow:0 8px 28px rgba(8,16,30,0.5);transition:transform 120ms ease,box-shadow 120ms ease}
        .btn:active{transform:translateY(1px)}
        .btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;box-shadow:none}
        .field-error{color:var(--err);font-size:12px;margin-top:6px}
        .server-error{color:var(--err);font-size:13px;margin-bottom:8px;text-align:center}
        .micro{text-align:center;font-size:12px;color:var(--muted);margin-top:12px}
        @media (max-width:600px){.card{padding:20px;margin:0 10px;max-width:420px;border-radius:14px}.brand h1{font-size:16px}.tabs{gap:6px}}
      `}</style>

      <div className="login-shell" role="presentation">
        <div className="grid-pattern" aria-hidden />
        <div className="glow-lines" aria-hidden />

        <section className="card" role="region" aria-label="Authentication panel">
          <div className="brand">
            <h1>EAZY_BYTZ TRADE-APP</h1>
            <p>Modern Stock Trading Simulator</p>
          </div>

          <nav className="tabs" role="tablist" aria-label="Auth tabs">
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
                  <button type="button" className="eye" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
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

              <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            </form>
          )}

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
                  placeholder="Email address (@gmail.com only)"
                  aria-label="Email address"
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

              <label>
                <div className="password-wrap">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    aria-label="Confirm password"
                    className={`input ${errors.confirmPassword ? 'err' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" className="eye" onClick={() => setShowConfirmPassword(s => !s)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
              </label>

              <div className="controls" style={{ justifyContent: 'flex-start' }}>
                <label className="checkbox-row">
                  <input name="remember" type="checkbox" checked={!!form.remember} onChange={handleChange} />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Sign Up'}</button>
            </form>
          )}

          <div className="micro">Built with ⚡ EAZY_BYTZ — reliable backend meets neon UI.</div>
        </section>
      </div>
    </>
  );
}
