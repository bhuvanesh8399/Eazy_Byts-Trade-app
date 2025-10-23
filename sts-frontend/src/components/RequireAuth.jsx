import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function RequireAuth() {
  const { hydrated, isAuthed } = useAuth();
  const location = useLocation();

  // Wait for hydrate (prevents false redirect before we read storage)
  if (!hydrated) {
    // small loader UI — keep minimal so guard doesn't redirect before hydration
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
