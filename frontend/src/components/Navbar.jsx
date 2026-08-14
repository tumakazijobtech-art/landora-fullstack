import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav>
      <Link className="nav-brand" to="/">
        <div className="nav-logo">L</div>
        <div className="nav-name">Landora</div>
      </Link>
      <div className="nav-links">
        <Link className="nav-link" to="/marketplace">Browse land</Link>
        {user && user.role === 'landowner' && (
          <Link className="nav-link" to="/dashboard">My listings</Link>
        )}
        {user && user.role === 'farmer' && (
          <Link className="nav-link" to="/dashboard">My applications</Link>
        )}
        {!user && (
          <>
            <Link className="nav-link" to="/login">Log in</Link>
            <Link className="nav-cta" to="/register">Get started</Link>
          </>
        )}
        {user && (
          <button className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            Log out ({user.name.split(' ')[0]})
          </button>
        )}
      </div>
    </nav>
  );
}
