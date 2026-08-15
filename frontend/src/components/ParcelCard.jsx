import React from 'react';
import { Link } from 'react-router-dom';
import ScoreBadge from './ScoreBadge.jsx';

function matchTier(score) {
  if (score >= 80) return 'match-high';
  if (score >= 55) return 'match-mid';
  return 'match-low';
}

export default function ParcelCard({ parcel }) {
  const hasMatch = typeof parcel.matchScore === 'number';

  return (
    <Link className="parcel-card" to={`/parcels/${parcel._id}`}>
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
  );
}
