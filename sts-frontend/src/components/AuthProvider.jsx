import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setToken as setAuthToken, clearToken as clearAuthToken, getToken } from '../lib/auth';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

function normalizeTokensFromPayload(payload = {}) {
  const accessToken = payload?.accessToken ?? payload?.access ?? payload?.token ?? payload?.access_token ?? payload?.jwt ?? null;
  const refreshToken = payload?.refreshToken ?? payload?.refresh ?? payload?.refresh_token ?? null;
  const user = payload?.user ?? payload?.userData ?? payload?.account ?? payload?.profile ?? null;
  return { accessToken, refreshToken, user };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage to avoid premature redirects
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // read persisted token(s)
        const t = getToken();
        if (!t) {
          if (mounted) setHydrated(true);
          return;
        }
        // attempt to fetch me
        try {
          const me = await api.me();
          if (mounted) {
            setAuth(prev => ({ ...(prev || {}), accessToken: t, user: me }));
          }
        } catch (e) {
          // token might be invalid — clear
          try { clearAuthToken(); } catch (err) {}
          if (mounted) setAuth(null);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function login({ usernameOrEmail, email, password, remember = false }) {
    if (!password || !(usernameOrEmail || email)) {
      throw new Error('Missing credentials');
    }
    const identifier = usernameOrEmail ?? email;
    // send named payload (server-side can accept email or usernameOrEmail)
    const payload = { email: identifier, usernameOrEmail: identifier, password };
    try {
      const res = await api.login(payload); // expects object
      const { accessToken, refreshToken, user } = normalizeTokensFromPayload(res ?? {});
      if (!accessToken) {
        // If backend returns tokens nested under data, attempt to extract
        throw new Error('No access token returned');
      }
      // persist
      setAuthToken(accessToken, !!remember);
      if (refreshToken) try { localStorage.setItem('refreshToken', refreshToken); } catch (e) {}
      if (user) try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
      setAuth({ accessToken, refreshToken, user });
      return res;
    } catch (err) {
      // unify error
      const status = err?.status ?? err?.response?.status ?? null;
      const data = err?.data ?? err?.response?.data ?? null;
      const msg = data?.message ?? err?.message ?? String(err);
      const out = new Error(msg);
      out.status = status;
      out.payload = data;
      throw out;
    }
  }

  function logout() {
    try { clearAuthToken(); } catch (e) {}
    try { localStorage.removeItem('refreshToken'); } catch (e) {}
    try { localStorage.removeItem('user'); } catch (e) {}
    setAuth(null);
  }

  const value = useMemo(() => ({
    auth,
    hydrated,
    user: auth?.user ?? null,
    isAuthed: Boolean(auth?.accessToken),
    login,
    logout,
    setAuth
  }), [auth, hydrated]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
