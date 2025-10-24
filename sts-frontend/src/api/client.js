// src/api/client.js
// Fetch helper that attaches JWT from localStorage and uses header-based auth.
// We DO NOT use cookies, so credentials can stay 'omit' to simplify CORS.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function coerceToken(raw) {
  if (!raw) return '';
  try {
    // If someone stored JSON string like {"accessToken":"..."}
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed.accessToken || parsed.token || parsed.jwt || '';
    }
  } catch {
    // plain string
  }
  // strip accidental quotes if any
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function getToken() {
  const keys = [
    'accessToken',
    'sts_access_token',
    'token',
    'jwt',
  ];
  for (const k of keys) {
    const v = coerceToken(localStorage.getItem(k));
    if (v) return v;
  }
  return '';
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: 'omit',
  };
  if (body !== undefined && body !== null) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.clone().json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  base: BASE_URL,
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),

  // SSE helper (token via query param; backend filter will promote it to Authorization)
  sse(path, onMessage, onError) {
    const token = getToken();
    const url = new URL(`${BASE_URL}${path}`);
    if (token) url.searchParams.set('access_token', token); // <— key agreed with backend filter
    const es = new EventSource(url.toString());
    es.onmessage = (e) => {
      try {
        onMessage?.(JSON.parse(e.data));
      } catch {
        // non-JSON events ignored
      }
    };
    es.onerror = (e) => {
      onError?.(e);
      es.close();
    };
    return () => es.close();
  },
};
