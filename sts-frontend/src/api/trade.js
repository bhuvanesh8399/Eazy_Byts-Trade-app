// src/api/trade.js
import { getToken } from './client';  // 👈 this is critical!

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

async function request(path, { method = 'GET', body, auth = true, headers, credentials } = {}) {
  if (!API_BASE) throw new Error('VITE_API_BASE is not set');
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: credentials ?? 'omit'  // we use Bearer token, no cookies
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

export const TradeAPI = {
  // REST Endpoints
  getHoldings: () => request('/portfolio/holdings'),
  getOrders:   (limit = 100) => request(`/orders?limit=${limit}`),
  placeOrder:  (payload) => request('/orders', { method: 'POST', body: payload }),
  getStats:    () => request('/portfolio/stats').catch(() => null),

  // SSE Stream URL (token in query param)
  sseOrdersURL() {
    const token = getToken();
    const base = API_BASE.replace(/\/$/, '').replace(/\/api$/, '');
    // must match backend's QueryParamBearerTokenFilter PARAM = "access_token"
    return `${base}/api/events/orders${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
  },

  // WebSocket Quotes URL
  quotesWSURL() {
    const base = API_BASE.replace(/\/$/, '').replace(/\/api$/, '').replace(/^http/i, 'ws');
    const token = getToken();
    // include token so backend can auth handshake
    return `${base}/ws/quotes${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
  }
};
