import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ParcelCard from '../components/ParcelCard.jsx';

export default function Saved() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getWishlist(token)
      .then((data) => setParcels(data.parcels))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div className="section-eyebrow">Your account</div>
        <h2 className="section-h2">Saved listings</h2>
        {error && <div className="error-box">{error}</div>}
        {parcels.length === 0 ? (
          <div className="empty-state">
            Nothing saved yet. Tap the heart on any listing to save it here. <Link to="/marketplace">Browse available land</Link>.
          </div>
        ) : (
          <div className="parcels-grid">
            {parcels.map((p) => <ParcelCard key={p._id} parcel={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
