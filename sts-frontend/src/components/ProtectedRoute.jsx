import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({ children }) {
  const { isAuthed, hydrated } = useAuth();
  const location = useLocation();

  // avoid redirect before hydration completes
  if (!hydrated) {
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
