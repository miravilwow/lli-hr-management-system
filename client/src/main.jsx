import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';

import App from './App';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#1668dc',
    borderRadius: 6,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      {/* AntApp provides the message/modal/notification instances used via App.useApp() */}
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
