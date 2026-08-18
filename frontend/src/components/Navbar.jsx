import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useBranding from '../hooks/useBranding.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { appLogoUrl } = useBranding();

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
    <nav className={user ? 'nav-stacked' : undefined}>
      <div className="nav-inner">
        <Link className="nav-brand" to="/">
          <img className="nav-logo" src={appLogoUrl} alt="Landora" width="32" height="32" />
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
          {user && (
            <Link className="nav-link" to="/saved">Saved</Link>
          )}
          {user && user.role !== 'admin' && (
            <Link className="nav-link" to="/intelligence">Land intelligence</Link>
          )}

          {!user && (
            <>
              <Link className="nav-link" to="/login">Log in</Link>
              <Link className="nav-cta" to="/register">Get started</Link>
            </>
          )}

          {user && (
            <>
              <Link className="nav-avatar-link" to="/profile" title="Your profile">
                {user.profilePicture ? (
                  <img className="nav-avatar" src={user.profilePicture} alt={user.name} />
                ) : (
                  <img className="nav-avatar nav-avatar-fallback" src={appLogoUrl} alt={user.name} />
                )}
                <span className="nav-avatar-name">{user.name.split(' ')[0]}</span>
              </Link>
              <button className="nav-link nav-logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                Log out
              </button>
            </>
          )}
        </div>
      </div>

      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
    </nav>
  );
}
