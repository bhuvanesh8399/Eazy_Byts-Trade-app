import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
import { getAccess, getRefresh, setTokens, clearTokens } from './tokens';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 10000,
});

// add access token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccess();
  if (token) {
    const headers: AxiosRequestHeaders = (config.headers || {}) as AxiosRequestHeaders;
  
    if (typeof (headers as any).set === 'function') (headers as any).set('Authorization', `Bearer ${token}`);
    else headers['Authorization'] = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

// refresh lock to avoid stampede
let refreshing = false;
let waiters: Array<(t: string | null) => void> = [];

function onRefreshed(newAccess: string | null) {
  waiters.forEach((cb) => cb(newAccess));
  waiters = [];
}

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (status === 401 && !original?._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = true;
        try {
          const refresh = getRefresh();
          if (!refresh) throw new Error('No refresh token');
          const r = await axios.post(
            `${import.meta.env.VITE_API_BASE}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refresh}` } }
          );
          const { accessToken, refreshToken } = (r.data || {}) as { accessToken: string; refreshToken?: string };
          setTokens(accessToken, refreshToken ?? refresh, /* persist? */ !!localStorage.getItem('sts_access_token'));
          refreshing = false;
          onRefreshed(accessToken);
        } catch (e) {
          refreshing = false;
          onRefreshed(null);
          clearTokens();
          // hard redirect to login
          window.location.href = '/login';
          return Promise.reject(e);
        }
      }

      // queue while refresh in progress
      return new Promise((resolve, reject) => {
        waiters.push((newAccess) => {
          if (!newAccess) return reject(error);
          // retry original with new access token
          const headers: Record<string, string> = {
            ...(original.headers as any),
            Authorization: `Bearer ${newAccess}`,
          };
          resolve(
            axios.request({
              ...original,
              headers,
            })
          );
        });
      });
    }
    return Promise.reject(error);
  }
);

export default api;

// Handy wrappers aligned with your contract
export const authApi = {
  register: (payload: { username: string; email: string; password: string }) =>
    axios.post(`${import.meta.env.VITE_API_BASE}/api/auth/register`, payload),
  login: (payload: { usernameOrEmail: string; password: string }) =>
    axios.post(`${import.meta.env.VITE_API_BASE}/api/auth/login`, payload),
  me: () => api.get('/api/me'),
};
