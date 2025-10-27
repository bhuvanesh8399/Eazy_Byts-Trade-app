import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Alternate guard component using the same semantics as ProtectedRoute
export default function RequireAuth({ children }) {
  const { authReady, isAuthed } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
