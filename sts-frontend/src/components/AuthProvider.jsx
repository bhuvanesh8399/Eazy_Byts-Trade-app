// src/components/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api'; // optional helper; we also have HTTP fallbacks
import {
  getToken,
  setToken as setStoredToken,   // alias to avoid name clash with React's setState
  persistTokens,
  clearToken,
  authHeader,
  enableTokenStorageSync,
} from '../lib/auth';

/**
 * AuthProvider
 * - Stores access token (persistent or session) using src/lib/auth.js helpers.
 * - Exposes loginWithPassword (POST /api/auth/login) and loginWithToken(token, { persist }).
 * - Keeps `user` in sync via api.me(token) OR GET /api/me fallback (then /api/auth/me).
 * - Provides setAuth/onLogin compatibility helpers for older pages.
 */

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [token, setTokState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // Keep in-memory token synced across tabs
  useEffect(() => {
    enableTokenStorageSync();
  }, []);

  // Fetch current user whenever token changes
  useEffect(() => {
    let cancelled = false;

    async function fetchMe(t) {
      if (!t) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        // 1) Try your api helper if it exists
        if (api && typeof api.me === 'function') {
          const res = await api.me(t);
          if (!cancelled) setUser(normalizeUser(res));
          return;
        }

        // 2) Fallback to /api/me
        let resp = await fetch('/api/me', { headers: { ...authHeader(t) } });
        if (!resp.ok) {
          // 3) Fallback to /api/auth/me (common alternative)
          resp = await fetch('/api/auth/me', { headers: { ...authHeader(t) } });
        }
        if (!resp.ok) throw new Error('Session invalid');

        const data = await resp.json().catch(() => ({}));
        if (!cancelled) setUser(normalizeUser(data));
      } catch (err) {
        // Token invalid → clear it once, avoid infinite loops
        if (!cancelled) {
          try { clearToken(); } catch {}
          setTokState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMe(token);
    return () => { cancelled = true; };
  }, [token]);

  // Helpers
  function normalizeUser(x) {
    if (!x) return null;
    // accept { user: {...} } or plain object
    return x.user ?? x;
  }

  /**
   * loginWithPassword
   * POST /api/auth/login with flexible payload; accepts { remember } to control persistence.
   * Usage: await loginWithPassword({ username, email, usernameOrEmail, password, remember: true/false })
   */
  async function loginWithPassword({ username, email, usernameOrEmail, password, remember = true }) {
    const body = {
      username: username || undefined,
      email: email || undefined,
      usernameOrEmail: usernameOrEmail || username || email, // backend may accept any of these
      password,
    };

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text().catch(() => '');
    let data; try { data = JSON.parse(text || '{}'); } catch { data = { message: text || res.statusText }; }

    if (!res.ok) {
      throw new Error(data?.message || data?.error || `Login failed (${res.status})`);
    }

    // Parse common token shapes and persist
    let access =
      data.accessToken ||
      data.token ||
      data.jwt ||
      (data.data && (data.data.accessToken || data.data.token));

    // If backend returned a nested token structure, persist that whole payload (keeps refresh too).
    const persisted = persistTokens(data); // defaults to persistent (localStorage)
    access = access || persisted;

    if (!access) throw new Error('Login response missing access token');

    // If remember is false, move token into sessionStorage (session-only)
    if (!remember) {
      setStoredToken(access, false); // persist=false → sessionStorage
    }

    setTokState(access);
    // If backend returned user, prefill UI now; otherwise /me will populate next
    if (data?.user) setUser(normalizeUser(data));
    return { user: data?.user ?? null, raw: data };
  }

  /**
   * loginWithToken
   * Directly set a known token. Pass { persist: false } for session-only behavior.
   */
  function loginWithToken(accessToken, opts = { persist: true }) {
    if (!accessToken) throw new Error('Missing token');
    const persist = !!(opts?.persist);
    setStoredToken(accessToken, persist);
    setTokState(accessToken);
  }

  /**
   * setAuth
   * Compatibility helper: accepts an object and extracts token/user from multiple shapes.
   */
  function setAuth(obj) {
    const access =
      obj?.accessToken ||
      obj?.token ||
      obj?.access_token ||
      obj?.jwt ||
      (obj?.data && (obj.data.accessToken || obj.data.token)) ||
      getToken();

    if (access) {
      // default to persistent; callers can move it to session later if needed
      setStoredToken(access, true);
      setTokState(access);
    }
    if (obj?.user) setUser(normalizeUser(obj));
  }

  /**
   * onLogin
   * Alias for legacy codepaths (just calls setAuth).
   */
  function onLogin(obj) {
    setAuth(obj);
  }

  /**
   * logout
   * Clears tokens everywhere and resets state.
   */
  function logout() {
    try { clearToken(); } catch {}
    setTokState(null);
    setUser(null);
  }

  const value = useMemo(() => ({
    token,
    user,
    isAuthed: !!token,
    loading,
    // actions
    loginWithPassword,
    loginWithToken,
    logout,
    setAuth,
    onLogin,
  }), [token, user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
