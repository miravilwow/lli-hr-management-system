import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './context/AuthProvider';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));

function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

export default function App({ onToggleTheme, isDark }) {
  return (
    <AuthProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout onToggleTheme={onToggleTheme} isDark={isDark} />}>
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/reports" element={<ReportPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
