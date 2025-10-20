import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Portfolio from './pages/Portfolio';
import Orders from './pages/Orders';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './components/AuthProvider';

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="container row" style={{ justifyContent: 'space-between' }}>
      <div className="row">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/portfolio">Portfolio</NavLink>
        <NavLink to="/orders">Orders</NavLink>
      </div>
      <div className="row">
        {user ? (
          <>
            <span className="muted">Hi, {user.name || user.email}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <NavLink to="/login">Login</NavLink>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
