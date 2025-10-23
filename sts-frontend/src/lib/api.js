import { getToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function coreFetch(path, { auth = true, method = 'GET', body, headers, credentials } = {}) {
  if (!API_BASE) throw new Error('VITE_API_BASE is not set');
  const url = `${API_BASE}${path}`;
  const token = auth ? getToken() : null;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: credentials ?? 'same-origin'
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(data?.message || data || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (payload) => coreFetch('/api/auth/login', { auth: false, method: 'POST', body: payload }),
  me: () => coreFetch('/api/me'),
  ping: () => coreFetch('/ping', { auth: false }),
};
