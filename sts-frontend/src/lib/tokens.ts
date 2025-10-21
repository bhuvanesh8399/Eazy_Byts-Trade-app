type Pair = { accessToken: string | null; refreshToken: string | null };

const ACCESS_KEY = 'sts_access_token';
const REFRESH_KEY = 'sts_refresh_token';

let mem: Pair = { accessToken: null, refreshToken: null };

export function setTokens(access: string, refresh: string, persist = false) {
  mem.accessToken = access || null;
  mem.refreshToken = refresh || null;
  if (persist) {
    localStorage.setItem(ACCESS_KEY, access || '');
    localStorage.setItem(REFRESH_KEY, refresh || '');
  }
}

export function getAccess() {
  if (mem.accessToken) return mem.accessToken;
  const ls = localStorage.getItem(ACCESS_KEY);
  if (ls) mem.accessToken = ls;
  return mem.accessToken;
}

export function getRefresh() {
  if (mem.refreshToken) return mem.refreshToken;
  const ls = localStorage.getItem(REFRESH_KEY);
  if (ls) mem.refreshToken = ls;
  return mem.refreshToken;
}

export function clearTokens() {
  mem = { accessToken: null, refreshToken: null };
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
