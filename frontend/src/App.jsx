import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ParcelDetail from './pages/ParcelDetail.jsx';
import CreateParcel from './pages/CreateParcel.jsx';
import LandownerDashboard from './pages/LandownerDashboard.jsx';
import FarmerDashboard from './pages/FarmerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminParcelEditor from './pages/AdminParcelEditor.jsx';
import AdminLandUses from './pages/AdminLandUses.jsx';

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'landowner') return <LandownerDashboard />;
  if (user.role === 'admin') return <AdminDashboard />;
  return <FarmerDashboard />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
          path="/admin/parcels/:id"
          element={
            <ProtectedRoute role="admin">
              <AdminParcelEditor />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
