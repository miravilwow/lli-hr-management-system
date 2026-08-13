import axios from 'axios';

export const TOKEN_KEY = 'lli_hr_token';
export const REFRESH_KEY = 'lli_hr_refresh';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
});

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Set by AuthProvider so an expired session can be handled inside React
// rather than by forcing a full page load.
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

/**
 * Access tokens last 15 minutes, so a 401 mid-session is expected rather
 * than exceptional. One refresh runs at a time and every request that
 * hit a 401 waits on it, otherwise a page issuing several calls at once
 * would fire several refreshes and rotate the token out from under
 * itself.
 */
let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  // A bare axios call, so this request does not re-enter the interceptor.
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
      // A 401 from login or refresh itself means the session is genuinely
      // over; anything else here is not a session problem at all.
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

      // Replay the original request once, with the new token.
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

/** Pulls the most useful message out of an axios error for display. */
export function getErrorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data;

  if (data?.details?.length) {
    return data.details.map((d) => d.message).join(', ');
  }

  return data?.message || error?.message || fallback;
}

export default api;
