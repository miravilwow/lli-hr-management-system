import axios from 'axios';

export const TOKEN_KEY = 'lli_hr_token';
export const REFRESH_KEY = 'lli_hr_refresh';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export function storeTokens({ token, refreshToken }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function endSession() {
  clearTokens();
  onUnauthorized?.();
}

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });

  storeTokens(data);
  return data.token;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const url = config?.url ?? '';

    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (response?.status !== 401 || isAuthCall || config?._retried) {
      if (response?.status === 401 && !url.includes('/auth/login')) {
        endSession();
      }
      return Promise.reject(error);
    }

    try {
      refreshInFlight = refreshInFlight || refreshAccessToken();
      const token = await refreshInFlight;

      if (!token) {
        endSession();
        return Promise.reject(error);
      }

      config._retried = true;
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (refreshError) {
      endSession();
      return Promise.reject(refreshError);
    } finally {
      refreshInFlight = null;
    }
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data;

  if (data?.details?.length) {
    return data.details.map((d) => d.message).join(', ');
  }

  return data?.message || error?.message || fallback;
}

export default api;
