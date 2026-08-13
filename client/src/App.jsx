import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import EmployeesPage from './pages/EmployeesPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/reports" element={<ReportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  );
}
