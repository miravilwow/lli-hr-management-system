import axios from 'axios';

export const TOKEN_KEY = 'lli_hr_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on any request other than the login call means the session is gone.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
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
