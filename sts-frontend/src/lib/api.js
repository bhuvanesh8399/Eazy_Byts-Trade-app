// src/api.js
export async function coreFetch(path, { token, method = 'GET', headers = {}, body } = {}) {
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(path, { method, headers: finalHeaders, body }); // NOTE: relative path
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
  me:        (token)                 => coreFetch('/api/me', { token }),
  holdings:  (token)                 => coreFetch('/api/portfolio/holdings', { token }),
  stats:     (token)                 => coreFetch('/api/portfolio/stats', { token }),
  orders:    (token, limit = 50)     => coreFetch(`/api/orders?limit=${limit}`, { token }),
  placeOrder:(token, payload)        => coreFetch('/api/orders', { token, method: 'POST', body: payload }),
};
