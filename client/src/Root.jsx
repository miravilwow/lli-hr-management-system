import { App as AntApp, ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { buildTheme } from './theme';
import useThemeMode from './hooks/useThemeMode';

/**
 * Everything the whole tree depends on: the theme, Ant Design's context
 * holders for message/modal/notification, and the router.
 */
export default function Root() {
  const { mode, toggle, isDark } = useThemeMode();

  return (
    <ConfigProvider
      theme={buildTheme(mode)}
      // Exposes the tokens as CSS variables, so index.css can use the same
      // palette instead of duplicating hex values.
      cssVar
    >
      <AntApp>
        <BrowserRouter>
          <App onToggleTheme={toggle} isDark={isDark} />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
