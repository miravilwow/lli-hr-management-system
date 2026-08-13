import { useCallback, useEffect, useMemo, useState } from 'react';

import api, {
  REFRESH_KEY,
  TOKEN_KEY,
  clearTokens,
  setUnauthorizedHandler,
  storeTokens,
} from '../api/client';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);

  // On first load, exchange any stored token for the current user so a
  // refresh does not drop the session. If the access token has expired
  // the axios interceptor renews it transparently before this resolves.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY) && !localStorage.getItem(REFRESH_KEY)) {
      setInitialising(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => clearTokens())
      .finally(() => setInitialising(false));
  }, []);

  // When the API reports the session is gone, clear the user and let
  // ProtectedRoute redirect. Reloading the page here instead would throw
  // away all in-memory state and flash a blank screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    storeTokens(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    // Revoke server-side first, so the refresh token cannot be reused
    // even if a copy was captured. Failing to reach the server must not
    // trap the user in a session they asked to leave.
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignored on purpose
    }

    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initialising, login, logout, isAdmin: user?.role === 'Admin' }),
    [user, initialising, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
