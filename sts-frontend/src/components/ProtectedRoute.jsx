import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="container p-6">Checking session...</div>;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
