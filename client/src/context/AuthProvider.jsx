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

    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
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
