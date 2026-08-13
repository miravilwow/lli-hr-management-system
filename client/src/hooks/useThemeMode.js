import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lli_hr_theme';

/** Falls back to the operating system preference on a first visit. */
function initialMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function useThemeMode() {
  const [mode, setMode] = useState(initialMode);

  // Mirrored onto the document so plain CSS can respond too, not just
  // components rendered through Ant Design.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { mode, toggle, isDark: mode === 'dark' };
}
