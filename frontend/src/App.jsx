import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyAccount from './pages/VerifyAccount.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ParcelDetail from './pages/ParcelDetail.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import BottomNav from './components/BottomNav.jsx';
import ChatDrawer from './components/ChatDrawer.jsx';

// Code-split the pages most visitors never open in a given session (listing creation,
// the two dashboards, and the whole admin back office). This keeps the first-load
// bundle focused on browsing — the actual "frequently viewed" path — and defers the
// rest until someone navigates there.
const CreateParcel = lazy(() => import('./pages/CreateParcel.jsx'));
const LandownerDashboard = lazy(() => import('./pages/LandownerDashboard.jsx'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminParcelEditor = lazy(() => import('./pages/AdminParcelEditor.jsx'));
const AdminLandUses = lazy(() => import('./pages/AdminLandUses.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Saved = lazy(() => import('./pages/Saved.jsx'));

function PageFallback() {
  return <div className="section"><div className="section-inner">Loading…</div></div>;
}

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'landowner') return <LandownerDashboard />;
  if (user.role === 'admin') return <AdminDashboard />;
  return <FarmerDashboard />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <div className={`nav-bottom-spacer${user ? ' has-bottom-nav-spacer' : ''}`}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyAccount />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/parcels/:id" element={<ParcelDetail />} />
            <Route
              path="/parcels/new"
              element={
                <ProtectedRoute role="landowner">
                  <CreateParcel />
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
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/saved"
              element={
                <ProtectedRoute>
                  <Saved />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/land-uses"
              element={
                <ProtectedRoute role="admin">
                  <AdminLandUses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parcels/:id"
              element={
                <ProtectedRoute role="admin">
                  <AdminParcelEditor />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </div>
      {user && <BottomNav />}
      <ChatDrawer />
    </>
  );
}
