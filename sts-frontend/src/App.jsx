import { NavLink, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Portfolio from './pages/Portfolio';
import Orders from './pages/Orders';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './components/AuthProvider';

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="glass-nav container row" style={{ justifyContent: 'space-between' }}>
      <div className="row" style={{ gap: '0.5rem' }}>
        <NavLink to="/" end className="glass-btn">Dashboard</NavLink>
        <NavLink to="/portfolio" className="glass-btn">Portfolio</NavLink>
        <NavLink to="/orders" className="glass-btn">Orders</NavLink>
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
        {user ? (
          <>
            <span className="muted">Hi, {user.name || user.email}</span>
            <button className="glass-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <NavLink to="/login" className="glass-btn">Login</NavLink>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      {/* Global toast container */}
      <Toaster position="top-right" />
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
}
