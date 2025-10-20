const KEY = 'sts_access_token';
let token = null;

export function setToken(t, persist = false) {
  token = t || null;
  if (persist) {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  }
}

export function getToken() {
  if (token) return token;
  const saved = localStorage.getItem(KEY);
  if (saved) token = saved;
  return token;
}

export function clearToken() {
  token = null;
  localStorage.removeItem(KEY);
}
