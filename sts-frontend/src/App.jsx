import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home.jsx';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Portfolio from './pages/Portfolio';
import Orders from './pages/Orders';
import NavBar from './components/NavBar';
import './styles/global.css';
import './styles/enhancements.css';

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <NavBar />
      <div className="container app-body" style={{ paddingTop: 64 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
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
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <div style={{ padding: 24 }}>
                  <h2 style={{ marginBottom: 12 }}>Help</h2>
                  <p className="muted">Explore Dashboard for live quotes, Orders for activity, and Portfolio for allocations and PnL. Need more? We can wire real docs here.</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div style={{ padding: 24 }}>
                  <h2 style={{ marginBottom: 12 }}>Settings</h2>
                  <div className="card" style={{ padding: 16 }}>
                    <div className="muted">App preferences will go here (theme, density, notifications).</div>
                  </div>
                </div>
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
