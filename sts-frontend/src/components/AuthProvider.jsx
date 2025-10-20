import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setToken as setAuthToken, clearToken as clearAuthToken, getToken } from '../lib/auth';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) { setChecking(false); return; }
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
      } catch {
        clearAuthToken();
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({
    user,
    checking,
    login: async ({ email, password, remember }) => {
      const res = await api.login(email, password);
      if (res?.accessToken) setAuthToken(res.accessToken, Boolean(remember));
      if (res?.user) setUser(res.user);
      return res;
    },
    logout: () => { clearAuthToken(); setUser(null); }
  }), [user, checking]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
