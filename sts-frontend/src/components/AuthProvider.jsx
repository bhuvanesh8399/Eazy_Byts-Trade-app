import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);  // ✅ Tells guards when boot check is done
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);

  async function loadMe() {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      if (!getAccessToken()) {
        setUser(null);
        setErr(null);
        return;
      }
      const me = await api.get('/me', { signal: ctrl.signal });
      setUser(me);
      setErr(null);
    } catch (e) {
      console.error('[AuthProvider] Error loading user:', e);
      if (String(e).includes('401') || String(e).includes('403')) {
        clearTokens();
        setUser(null);
      }
      setErr(e.message || 'Failed to load user');
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadMe();
      setLoading(false);
      setAuthReady(true);  // ✅ Mark as ready after boot check
    })();

    const onStorage = (ev) => {
      if (ev.key === 'access_token' || ev.key === 'refresh_token') loadMe();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function register({ username, email, password }) {
    const resp = await api.post('/auth/register', { username, email, password });
    setTokens(resp || {});
    await loadMe();
    setAuthReady(true);  // ✅ Ensure ready after registration
    return resp;
  }

  async function login({ username, password }) {
    const requestBody = { usernameOrEmail: username, password };
    const resp = await api.post('/auth/login', requestBody);
    setTokens(resp || {});
    await loadMe();
    setAuthReady(true);  // ✅ Ensure ready after login
    return resp;
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    clearTokens();
    setUser(null);
    setAuthReady(true);  // ✅ Mark ready on logout
  }

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      loading,
      authReady,  // ✅ Expose authReady
      err,
      register,
      login,
      logout,
      reloadMe: loadMe,
    }),
    [user, loading, authReady, err]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (ctx === null) {
    throw new Error('useAuth() must be used inside <AuthProvider>. Wrap your app in AuthProvider.');
  }
  return ctx;
}
