import { App as AntApp, ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { buildTheme } from './theme';
import useThemeMode from './hooks/useThemeMode';

export default function Root() {
  const { mode, toggle, isDark } = useThemeMode();

  return (
    <ConfigProvider
      theme={buildTheme(mode)}
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
