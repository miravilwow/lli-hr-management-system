import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import api, { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
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

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
