// src/api.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export async function coreFetch(path, { token, method = 'GET', headers = {}, body } = {}) {
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const fullPath = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(fullPath, { method, headers: finalHeaders, body });
  if (!res.ok) {
    // Optional: throw with readable JSON if server sent it
    const text = await res.text().catch(() => '');
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text || res.statusText }; }
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // 204? return null
  if (res.status === 204) return null;
  return res.json();
}

// Convenience wrappers used in your app
export const api = {
  me:        (token)                 => coreFetch('/me', { token }),
  holdings:  (token)                 => coreFetch('/portfolio/holdings', { token }),
  stats:     (token)                 => coreFetch('/portfolio/stats', { token }),
  orders:    (token, limit = 50)     => coreFetch(`/orders?limit=${limit}`, { token }),
  placeOrder:(token, payload)        => coreFetch('/orders', { token, method: 'POST', body: payload }),
};
