import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LOGO_URL } from '../constants.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on route change and on resize back up to desktop width.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 760) setOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate('/');
  }

  return (
    <nav>
      <Link className="nav-brand" to="/">
        <img className="nav-logo" src={LOGO_URL} alt="Landora" width="32" height="32" />
        <div className="nav-name">Landora</div>
      </Link>

      <button
        className={`nav-hamburger ${open ? 'open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-links ${open ? 'nav-links-open' : ''}`}>
        <Link className="nav-link" to="/marketplace">Browse land</Link>
        {user && user.role === 'landowner' && (
          <Link className="nav-link" to="/dashboard">My listings</Link>
        )}
        {user && user.role === 'farmer' && (
          <Link className="nav-link" to="/dashboard">My applications</Link>
        )}
        {user && user.role === 'admin' && (
          <>
            <Link className="nav-link" to="/admin">Admin listings</Link>
            <Link className="nav-link" to="/admin/land-uses">Land uses</Link>
          </>
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

      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
    </nav>
  );
}
