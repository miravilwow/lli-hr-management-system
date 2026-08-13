import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import EmployeesPage from './pages/EmployeesPage';
import LoginPage from './pages/LoginPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/reports" element={<ReportPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </AuthProvider>
  );
}
