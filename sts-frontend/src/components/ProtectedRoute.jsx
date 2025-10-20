import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <div className="container"><p className="muted">Checking session…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
  