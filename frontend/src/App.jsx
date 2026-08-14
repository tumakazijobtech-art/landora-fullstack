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
import Match from './pages/Match.jsx';
import Admin from './pages/Admin.jsx';

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'landowner' ? <LandownerDashboard /> : <FarmerDashboard />;
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
        <Route path="/match" element={<Match />} />
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
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
