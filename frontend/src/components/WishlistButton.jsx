import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Heart-shaped save/wishlist toggle. Works from the marketplace card grid (compact,
// floats over the photo) or the parcel detail page's icon-button row (variant="icon").
// Guests are sent to log in first — the wishlist is per-account.
export default function WishlistButton({ parcelId, variant = 'compact', onToggled }) {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const saved = Boolean(user && (user.wishlist || []).includes(parcelId));

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    const wasSaved = saved;
    // Optimistic update so the heart flips instantly.
    const nextWishlist = wasSaved
      ? (user.wishlist || []).filter((id) => id !== parcelId)
      : [...(user.wishlist || []), parcelId];
    updateUser({ wishlist: nextWishlist });
    try {
      if (wasSaved) {
        await api.removeFromWishlist(parcelId, token);
      } else {
        await api.addToWishlist(parcelId, token);
      }
      onToggled?.(!wasSaved);
    } catch (err) {
      // Roll back on failure.
      updateUser({ wishlist: user.wishlist || [] });
    } finally {
      setBusy(false);
    }
  }

  const heart = (
    <svg width={variant === 'icon' ? 17 : 15} height={variant === 'icon' ? 17 : 15} viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}>
      <path d="M12 21s-7.5-4.6-10-9.2C.5 8.2 2.3 4.5 6 4c2.2-.3 4 .9 6 3 2-2.1 3.8-3.3 6-3 3.7.5 5.5 4.2 4 7.8C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`icon-btn ${saved ? 'icon-btn-active' : ''}`}
        title={saved ? 'Remove from saved listings' : 'Save this listing'}
        aria-label={saved ? 'Remove from saved listings' : 'Save this listing'}
        aria-pressed={saved}
        onClick={toggle}
        disabled={busy}
      >
        {heart}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`wishlist-btn ${saved ? 'is-saved' : ''}`}
      title={saved ? 'Remove from saved listings' : 'Save this listing'}
      aria-label={saved ? 'Remove from saved listings' : 'Save this listing'}
      aria-pressed={saved}
      onClick={toggle}
      disabled={busy}
    >
      {heart}
    </button>
  );
}
