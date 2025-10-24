import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Portfolio from './pages/Portfolio';
import Orders from './pages/Orders';
import { useAuth } from './components/AuthProvider';
import './styles/global.css';

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="glass-nav container row nav-bar">
      <div className="nav-left">
        <NavLink to="/" end className="brand">
          <strong>EAZY_BYTZ</strong>
        </NavLink>
        <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
        <NavLink to="/portfolio" className="nav-link">Portfolio</NavLink>
        <NavLink to="/orders" className="nav-link">Orders</NavLink>
      </div>

      <div className="nav-right">
        {user ? (
          <>
            <span className="muted">
              Hi, {user.name || user.username || user.email}
            </span>
            <button
              className="glass-btn"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/login" className="glass-btn">
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <NavBar />
      <div className="container app-body">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          {/* fallback route */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}
