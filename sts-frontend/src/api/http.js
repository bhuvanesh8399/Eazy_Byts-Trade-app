// src/api/http.js
import axios from 'axios';
import { getToken, clearToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
export const http = axios.create({ baseURL: API_BASE, withCredentials: false });

http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (e) => { if (e?.response?.status === 401) clearToken(); return Promise.reject(e); }
);
