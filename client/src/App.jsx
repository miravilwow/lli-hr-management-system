import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './context/AuthProvider';

// Split per route. The login screen is the only thing an unauthenticated
// visitor can reach, and it should not carry the cost of downloading the
// employee table and the report alongside it.
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
