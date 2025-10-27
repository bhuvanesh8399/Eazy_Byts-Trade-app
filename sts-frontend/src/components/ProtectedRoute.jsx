import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Supports two usages:
// 1) As a wrapper around children: <ProtectedRoute><Dashboard/></ProtectedRoute>
// 2) As a Route guard with nested routes using <Outlet/>
export default function ProtectedRoute({ children }) {
  const { isAuthed, authReady } = useAuth();

  // Wait for initial auth check to avoid flicker/false redirect
  if (!authReady) {
    return (
      <div className="page-wrap">
        <p style={{ textAlign: 'center', padding: 24 }}>Checking session…</p>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  // If children are passed (wrapper usage), render them; else render nested routes
  return children ? <>{children}</> : <Outlet />;
}
