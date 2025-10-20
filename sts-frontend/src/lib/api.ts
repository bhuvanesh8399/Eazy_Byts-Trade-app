// src/lib/api.ts
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 10000,
});

// REQUEST INTERCEPTOR
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("sts_token");
  if (token) {
    // Ensure headers exists and is typed as AxiosRequestHeaders
    const headers: AxiosRequestHeaders = (config.headers || {}) as AxiosRequestHeaders;

    // Prefer the AxiosHeaders API when available
    
    if (typeof (headers as any).set === "function") {
      // AxiosHeaders instance
      (headers as any).set("Authorization", `Bearer ${token}`);
    } else {
      // Plain object fallback
      headers["Authorization"] = `Bearer ${token}`;
    }

    config.headers = headers;
  }
  return config;
});

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sts_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
