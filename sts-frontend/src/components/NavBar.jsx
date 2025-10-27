// src/components/NavBar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const BRAND = 'EAZY_BYTZ';

export default function NavBar() {
  const { isAuthed, logout, user } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef(null);

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

  // Show when cursor is at the very top 8px, or when the bar has focus/hover
  useEffect(() => {
    function onMove(e) {
      if (e.clientY <= 8) {
        setVisible(true);
        if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
      }
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 1200);
  };

  return (
    <header
      className={`nb-wrap ${visible ? 'nb-show' : ''}`}
      onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); setVisible(true); }}
      onMouseLeave={scheduleHide}
      onFocus={() => setVisible(true)}
      onBlur={scheduleHide}
    >
      <style>{`
        .nb-wrap {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 40;
          backdrop-filter: saturate(160%) blur(10px);
          background: linear-gradient(180deg, rgba(7,16,38,0.86), rgba(7,16,38,0.62));
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 10px 28px rgba(3,7,18,0.35);
          transform: translateY(-100%);
          transition: transform 220ms ease;
        }
        .nb-wrap.nb-show { transform: translateY(0); }

        .nb {
          width: 96%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 10px 8px;
          display: flex;
          align-items: center;
          color: #dbeafe;
          gap: 12px;
        }
        .nb-left { display: flex; align-items: center; }
        .nb-center { flex: 1; display: ${isAuthed ? 'flex' : 'none'}; align-items: center; justify-content: center; gap: 6px; }
        .nb-right { display: ${isAuthScreen ? 'none' : 'flex'}; align-items: center; margin-left: auto; }

        .brand {
          font-weight: 1000;
          letter-spacing: 1px;
          font-size: 20px;
          padding: 8px 12px;
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(96,165,250,0.25), rgba(94,234,212,0.15));
          border: 1px solid rgba(255,255,255,0.10);
          text-decoration: none;
          color: #eaf4ff;
        }

        .nb-link {
          position: relative;
          padding: 8px 12px;
          border-radius: 10px;
          color: rgba(222,239,255,0.8);
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 120ms ease;
        }
        .nb-link:hover { color: #fff; background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.08); }
        .nb-link.active {
          color: #0b1222;
          background: linear-gradient(90deg, #bfe9ff, #b2fff0);
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(12,74,110,0.35);
        }
        .nb-link:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(96,165,250,0.9); }

        .nb-auth {
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          color: #eaf2ff;
          cursor: pointer;
          display: inline-flex;
        }
        .nb-auth:hover { border-color: rgba(147,197,253,0.5); }
        .nb-auth:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(96,165,250,0.9); }
      `}</style>

      <nav className="nb" role="navigation" aria-label="Primary">
        <div className="nb-left">
          <NavLink to="/dashboard" className="brand">{BRAND}</NavLink>
        </div>

        <div className="nb-center">
          <NavLink to="/" end className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Home</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Portfolio</NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Orders</NavLink>
          <NavLink to="/help" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Help</NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nb-link ${isActive ? 'active' : ''}`}>Settings</NavLink>
        </div>

        <div className="nb-right">
          <button type="button" className="nb-auth" onClick={onAuthClick}>
            {isAuthed ? `Sign out ${user?.username ? '(' + user.username + ')' : ''}` : 'Sign in'}
          </button>
        </div>
      </nav>
    </header>
  );
}
