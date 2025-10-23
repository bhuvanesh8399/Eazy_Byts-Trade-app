const KEY = 'sts_access_token';
let token = null;

export function setToken(t, persist = false) {
  token = t || null;
  if (persist) {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } else {
    // store in sessionStorage for session-only behavior
    try { sessionStorage.setItem(KEY, t || ''); } catch (e) {}
  }
}

export function getToken() {
  if (token) return token;
  const saved = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
  if (saved) {
    token = saved || null;
    return token;
  }
  return null;
}

export function clearToken() {
  token = null;
  try { localStorage.removeItem(KEY); } catch (e) {}
  try { sessionStorage.removeItem(KEY); } catch (e) {}
}
