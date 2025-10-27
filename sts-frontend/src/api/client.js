// src/api/client.js

// ── Bases from env (NO proxy) ────────────────────────────────────────────────
const HTTP_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  (HTTP_BASE.startsWith('https')
    ? HTTP_BASE.replace(/^https/, 'wss').replace(/\/api$/, '/ws')
    : HTTP_BASE.replace(/^http/, 'ws').replace(/\/api$/, '/ws'));

console.log('[API Config]', {
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
  VITE_WS_BASE: import.meta.env.VITE_WS_BASE,
  HTTP_BASE,
  WS_BASE
});

// ── Token helpers ────────────────────────────────────────────────────────────
export function getAccessToken() {
  return localStorage.getItem('access_token') || null;
}
export function setTokens({ accessToken, refreshToken } = {}) {
  if (accessToken) localStorage.setItem('access_token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
}
export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Optional: read refresh token for auto-renew
export function getRefreshToken() {
  return localStorage.getItem('refresh_token') || null;
}

// ── Core fetch that always uses HTTP_BASE and attaches JWT if present ────────
async function coreFetch(path, init = {}) {
  const url = `${HTTP_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  console.log('[API] Fetching:', url);
  
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const t = getAccessToken();
  if (t) {
    headers.set('Authorization', `Bearer ${t}`);
    console.log('[API] Token attached:', t.substring(0, 20) + '...');
  } else {
    console.warn('[API] No token found for:', url);
  }

  try {
    const res = await fetch(url, { ...init, headers });
    console.log('[API] Response:', res.status, res.statusText, url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[API] Error:', res.status, res.statusText, url, 'Response:', text);
      // Try refresh on 401 (once), then retry original
      if (res.status === 401 && !init._retry) {
        try {
          const rt = getRefreshToken();
          if (rt) {
            console.warn('[API] Attempting token refresh...');
            const r = await fetch(`${HTTP_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: rt })
            });
            if (r.ok) {
              const tokens = await r.json();
              setTokens(tokens || {});
              // Retry original once with new token
              const retryInit = { ...init, _retry: true };
              return await coreFetch(path, retryInit);
            }
          }
        } catch (e) {
          console.error('[API] Refresh failed:', e?.message || e);
        }
        console.error('[API] 401 Unauthorized - Clearing tokens.');
        clearTokens();
      }
      throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    console.log('[API] Data received:', data);
    return data;
  } catch (error) {
    console.error('[API] Fetch failed:', error.message, url);
    throw error;
  }
}

// ── SSE helper (adds ?access_token=...) ──────────────────────────────────────
function sse(path, onEvent, onFallbackToPoll) {
  const sep = path.includes('?') ? '&' : '?';
  const token = getAccessToken();
  const url = `${HTTP_BASE}${path}${token ? `${sep}access_token=${encodeURIComponent(token)}` : ''}`;

  let es;
  try {
    es = new EventSource(url);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); }
      catch { onEvent({ type: 'RAW', data: e.data }); }
    };
    es.onerror = () => { es.close(); onFallbackToPoll?.(); };
    return () => es.close();
  } catch {
    onFallbackToPoll?.();
    return () => {};
  }
}

// ── WS URL builder (adds ?access_token=...) ──────────────────────────────────
function buildWsUrl(path) {
  const token = getAccessToken();
  const sep = path.includes('?') ? '&' : '?';
  const base = WS_BASE.endsWith('/') ? WS_BASE.slice(0, -1) : WS_BASE;
  // If path already starts with '/ws', remove it to avoid duplication
  const cleanPath = path.startsWith('/ws') ? path.slice(3) : (path.startsWith('/') ? path : `/${path}`);
  const fullUrl = `${base}${cleanPath}${token ? `${sep}access_token=${encodeURIComponent(token)}` : ''}`;
  console.log('[WS] Connecting to:', fullUrl);
  return fullUrl;
}

// ── Public API ───────────────────────────────────────────────────────────────
export const api = {
  base: HTTP_BASE,
  wsBase: WS_BASE,

  get: (p, init) => coreFetch(p, init),
  post: (p, body, init) => coreFetch(p, { method: 'POST', body: JSON.stringify(body ?? {}), ...(init || {}) }),
  put:  (p, body, init) => coreFetch(p, { method: 'PUT',  body: JSON.stringify(body ?? {}), ...(init || {}) }),
  del:  (p, init)      => coreFetch(p, { method: 'DELETE', ...(init || {}) }),

  sse,
  buildWsUrl,
};
