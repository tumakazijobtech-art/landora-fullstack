import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const close = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav>
      <Link className="nav-brand" to="/" onClick={() => setOpen(false)}>
        <img className="nav-logo" src="/assets/landora-icon.svg" alt="Landora" />
        <div className="nav-name">Landora</div>
      </Link>
      <button className="nav-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="hamburger-lines" aria-hidden="true"><i /><i /><i /></span>
      </button>
      <div className={`nav-links ${open ? 'is-open' : ''}`}>
        <Link className="nav-link" onClick={() => setOpen(false)} to="/marketplace">Browse land</Link>
        <Link className="nav-link" onClick={() => setOpen(false)} to="/match">Landora Match</Link>
        {user && user.role === 'landowner' && (
          <Link className="nav-link" onClick={() => setOpen(false)} to="/dashboard">My listings</Link>
        )}
        {user && user.role === 'farmer' && (
          <Link className="nav-link" onClick={() => setOpen(false)} to="/dashboard">My applications</Link>
        )}
        {user && user.role === 'admin' && (
          <Link className="nav-link" onClick={() => setOpen(false)} to="/admin">Review console</Link>
        )}
        {!user && (
          <>
            <Link className="nav-link" onClick={() => setOpen(false)} to="/login">Log in</Link>
            <Link className="nav-cta" onClick={() => setOpen(false)} to="/register">Get started</Link>
          </>
        )}
        {user && (
          <button className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            Log out ({user.name?.split(' ')[0] || 'account'})
          </button>
        )}
      </div>
    </nav>
  );
}
