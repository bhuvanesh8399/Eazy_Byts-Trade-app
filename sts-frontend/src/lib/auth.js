// src/lib/auth.js

// Primary key your app uses
export const KEY = 'sts_access_token';

// Some libs/components expect these legacy names.
// We keep them in sync for maximum compatibility.
const LEGACY_ACCESS_KEYS = ['accessToken', 'token'];
const LEGACY_REFRESH_KEYS = ['refreshToken', 'refresh_token'];

let memToken = null;

/**
 * setToken(t, persist?)
 * - When persist = true → writes to localStorage (remember me)
 * - When persist = false → writes to sessionStorage (session-only)
 * - Keeps legacy keys in sync so other code paths still work.
 */
export function setToken(t, persist = false) {
  memToken = t || null;

  try {
    // Clean existing entries first
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {}

  if (persist) {
    try {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch {}
  } else {
    try {
      sessionStorage.setItem(KEY, t || '');
    } catch {}
  }

  // Sync legacy keys so older code paths keep working
  try {
    if (persist) {
      if (t) {
        localStorage.setItem('accessToken', t);
        localStorage.setItem('token', t);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
      }
      // session copies should be empty for persist=true
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('accessToken', t || '');
      sessionStorage.setItem('token', t || '');
      // local copies should be empty for persist=false
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
    }
  } catch {}
}

/**
 * persistTokens(payload)
 * Accepts many backend shapes and extracts tokens, then calls setToken(persist=true).
 * Also stores refresh tokens if present (legacy-friendly).
 * Returns the access token (or null if absent).
 */
export function persistTokens(payload = {}) {
  try {
    const access =
      payload.accessToken ??
      payload.access_token ??
      payload.token ??
      payload.jwt ??
      (payload.data && (payload.data.accessToken || payload.data.token)) ??
      null;

    const refresh =
      payload.refreshToken ??
      payload.refresh_token ??
      (payload.data && (payload.data.refreshToken || payload.data.refresh_token)) ??
      null;

    if (access) setToken(access, true); // persistent by default for "remember me" UX

    // Mirror refresh keys for libs that expect them
    try {
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('refresh_token', refresh);
      } else {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refresh_token');
      }
      // Clear session copies to avoid ambiguity
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('refresh_token');
    } catch {}

    return access || null;
  } catch {
    return null;
  }
}

/**
 * getToken()
 * - Uses in-memory memoized token when available for speed.
 * - Otherwise checks localStorage/sessionStorage with KEY, then legacy keys.
 */
export function getToken() {
  if (memToken) return memToken;

  try {
    const saved =
      localStorage.getItem(KEY) ??
      sessionStorage.getItem(KEY) ??
      localStorage.getItem('accessToken') ??
      sessionStorage.getItem('accessToken') ??
      localStorage.getItem('token') ??
      sessionStorage.getItem('token') ??
      null;

    if (saved) {
      memToken = saved || null;
      return memToken;
    }
  } catch {}

  return null;
}

/**
 * clearToken()
 * - Removes tokens from memory and all storage keys (primary + legacy).
 */
export function clearToken() {
  memToken = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  try {
    sessionStorage.removeItem(KEY);
  } catch {}

  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refresh_token');
  } catch {}

  try {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('refresh_token');
  } catch {}
}

/** Tiny helpers for convenience in fetch calls and guards */
export function authHeader(t = getToken()) {
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function isAuthed() {
  return !!getToken();
}

/**
 * Optional: call once in app bootstrap to keep memToken in sync across tabs.
 * Example usage: enableTokenStorageSync();
 */
export function enableTokenStorageSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (!e) return;
    const key = e.key || '';
    if (
      key === KEY ||
      LEGACY_ACCESS_KEYS.includes(key) ||
      LEGACY_REFRESH_KEYS.includes(key)
    ) {
      // recompute memToken from storage on any related change
      memToken = null;
      getToken();
    }
  });
}
