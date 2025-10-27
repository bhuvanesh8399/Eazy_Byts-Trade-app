// src/components/NavBar.jsx
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const BRAND = 'EAZY_BYTZ';

export default function NavBar() {
  const { isAuthed, logout, user } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();

  const onAuthClick = () => {
    if (isAuthed) {
      logout?.();
      navigate('/login', { replace: true });
    } else {
      navigate('/login');
    }
  };

  // Hide the top-right auth button on auth screens
  const isAuthScreen = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <header className="nb-wrap">
      <style>{`
        .nb-wrap {
          position: sticky;
          top: 0;
          z-index: 30;
          backdrop-filter: saturate(140%) blur(8px);
          background: rgba(7, 16, 38, 0.6);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nb {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #dbeafe;
        }
        .nb-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .brand {
          font-weight: 900;
          letter-spacing: 0.5px;
          font-size: 18px;
          padding: 6px 10px;
          border-radius: 10px;
          background: linear-gradient(90deg, rgba(96,165,250,0.18), rgba(94,234,212,0.12));
          border: 1px solid rgba(255,255,255,0.08);
        }
        .nb-links {
          display: ${isAuthed ? 'flex' : 'none'};
          gap: 10px;
          margin-left: 8px;
        }
        .nb-link {
          padding: 8px 10px;
          border-radius: 8px;
          color: rgba(222,239,255,0.8);
          text-decoration: none;
          border: 1px solid transparent;
        }
        .nb-link.active {
          color: #ffffff;
          border-color: rgba(147,197,253,0.35);
          background: linear-gradient(90deg, rgba(96,165,250,0.12), rgba(94,234,212,0.08));
        }
        .nb-link:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(96,165,250,0.9);
        }
        .nb-auth {
          display: ${isAuthScreen ? 'none' : 'inline-flex'};
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          color: #eaf2ff;
          cursor: pointer;
        }
        .nb-auth:hover {
          border-color: rgba(147,197,253,0.45);
        }
        .nb-auth:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(96,165,250,0.9);
        }
      `}</style>

      <nav className="nb">
        <div className="nb-left">
          <div className="brand">{BRAND}</div>
          <div className="nb-links">
            <NavLink to="/" end className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Home</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
            <NavLink to="/portfolio" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Portfolio</NavLink>
            <NavLink to="/orders" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Orders</NavLink>
          </div>
        </div>

        <button type="button" className="nb-auth" onClick={onAuthClick}>
          {isAuthed ? `Sign out ${user?.username ? '(' + user.username + ')' : ''}` : 'Sign in'}
        </button>
      </nav>
    </header>
  );
}
