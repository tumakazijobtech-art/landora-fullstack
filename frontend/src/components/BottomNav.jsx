import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function HomeIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5M6 9.8V20h5v-5.5h2V20h5V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SearchIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function HeartIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.5-4.6-10-9.2C.5 8.2 2.3 4.5 6 4c2.2-.3 4 .9 6 3 2-2.1 3.8-3.3 6-3 3.7.5 5.5 4.2 4 7.8C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}
function GridIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="4" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="13" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="13" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" /></svg>;
}
function UserIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 20c1.5-3.8 5-5.5 7.5-5.5s6 1.7 7.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

// App-style fixed bottom navigation, shown only on narrower viewports while a user is
// logged in (see .bottom-nav in styles.css) — the top navbar stays the primary nav on
// larger screens, this is the thumb-reachable, native-app-like equivalent on mobile.
export default function BottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  const dashboardLabel = user.role === 'landowner' ? 'Listings' : user.role === 'admin' ? 'Admin' : 'Applications';
  const dashboardPath = user.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <HomeIcon />
        <span>Home</span>
      </NavLink>
      <NavLink to="/marketplace" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <SearchIcon />
        <span>Browse</span>
      </NavLink>
      <NavLink to="/saved" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <HeartIcon />
        <span>Saved</span>
      </NavLink>
      <NavLink to={dashboardPath} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <GridIcon />
        <span>{dashboardLabel}</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        {user.profilePicture ? (
          <img className="bottom-nav-avatar" src={user.profilePicture} alt="" />
        ) : (
          <UserIcon />
        )}
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
