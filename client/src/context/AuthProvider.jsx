import { useCallback, useEffect, useMemo, useState } from 'react';

import api, { TOKEN_KEY, setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);

  // On first load, exchange any stored token for the current user so a
  // refresh does not drop the session.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setInitialising(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
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
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initialising, login, logout }),
    [user, initialising, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
