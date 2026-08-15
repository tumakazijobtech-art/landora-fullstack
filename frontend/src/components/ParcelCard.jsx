import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ScoreBadge from './ScoreBadge.jsx';
import WishlistButton from './WishlistButton.jsx';

function matchTier(score) {
  if (score >= 80) return 'match-high';
  if (score >= 55) return 'match-mid';
  return 'match-low';
}

// Small flip icon shown on the photo — tapping/clicking it flips the card in place to
// show admin-added highlights without leaving the browse page. It stops propagation so
// it never triggers the card's own link-to-detail navigation.
function FlipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 8a6 6 0 0110.5-3.9M16 4v3.5h-3.5M16 12a6 6 0 01-10.5 3.9M4 16v-3.5h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ParcelCard({ parcel }) {
  const [flipped, setFlipped] = useState(false);
  const hasMatch = typeof parcel.matchScore === 'number';
  const highlights = parcel.highlights || [];

  function toggleFlip(e) {
    e.preventDefault();
    e.stopPropagation();
    setFlipped((f) => !f);
  }

  return (
    <div className={`parcel-card-flip ${flipped ? 'is-flipped' : ''}`}>
      <div className="parcel-card-flip-inner">
        {/* ---- Front face: photo, price, quick tags ---- */}
        <Link className="parcel-card parcel-card-face parcel-card-front" to={`/parcels/${parcel._id}`}>
          <div className="parcel-img">
            {parcel.photos && parcel.photos[0] ? (
              <img className="parcel-photo" src={parcel.photos[0]} alt={parcel.title} loading="lazy" />
            ) : null}
            {parcel.season && <span className="parcel-badge-top">{parcel.season}</span>}
            {parcel.score && (
              <span className="parcel-score-top">
                <ScoreBadge score={parcel.score} size="xs" />
              </span>
            )}
            {hasMatch && (
              <span className={`match-badge ${matchTier(parcel.matchScore)}`}>
                {parcel.matchScore}% match
              </span>
            )}
            {highlights.length > 0 && (
              <button className="parcel-flip-btn" type="button" onClick={toggleFlip} aria-label="Show listing highlights">
                <FlipIcon />
              </button>
            )}
            <div className="parcel-wishlist-slot">
              <WishlistButton parcelId={parcel._id} />
            </div>
          </div>
          <div className="parcel-body">
            <div className="parcel-location">{parcel.location}, {parcel.county}</div>
            <div className="parcel-name">{parcel.title}</div>
            <div className="parcel-tags">
              <span className="parcel-tag">{parcel.sizeAcres} ac</span>
              <span className="parcel-tag">{parcel.crop}</span>
              {parcel.financingAvailable && <span className="parcel-tag">Financing</span>}
              {parcel.insured && <span className="parcel-tag">Insured</span>}
              {(parcel.tags || []).map((t) => (
                <span className="parcel-tag" key={t}>{t}</span>
              ))}
            </div>

            {hasMatch && parcel.matchReasons && parcel.matchReasons.length > 0 && (
              <div className="match-reasons">
                {parcel.matchReasons.map((r) => (
                  <span className="match-reason" key={r}>✓ {r}</span>
                ))}
              </div>
            )}

            <div className="parcel-footer">
              <div className="parcel-price">
                KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} <span>per ac per season</span>
              </div>
              <span className="parcel-btn">View parcel</span>
            </div>
          </div>
        </Link>

        {/* ---- Back face: admin-added highlights ---- */}
        <div className="parcel-card parcel-card-face parcel-card-back">
          <button className="parcel-flip-btn parcel-flip-btn-back" type="button" onClick={toggleFlip} aria-label="Back to photo">
            <FlipIcon />
          </button>
          <div className="parcel-back-eyebrow">Why this parcel</div>
          <div className="parcel-back-title">{parcel.title}</div>
          <ul className="parcel-back-highlights">
            {highlights.slice(0, 6).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <Link className="parcel-btn parcel-back-cta" to={`/parcels/${parcel._id}`}>See full listing</Link>
        </div>
      </div>
    </div>
  );
}
