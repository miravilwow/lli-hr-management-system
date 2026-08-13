import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, initialising } = useAuth();
  const location = useLocation();

  // Wait for the stored token to be validated before deciding, otherwise a
  // refresh would bounce an authenticated user back to the login screen.
  if (initialising) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
