import React from 'react';
import { Link } from 'react-router-dom';

export default function ParcelCard({ parcel }) {
  return (
    <Link className="parcel-card" to={`/parcels/${parcel._id}`}>
      <div className="parcel-img">
        {parcel.photos && parcel.photos[0] ? (
          <img className="parcel-photo" src={parcel.photos[0]} alt={parcel.title} loading="lazy" />
        ) : null}
        {parcel.season && <span className="parcel-badge-top">{parcel.season}</span>}
        {parcel.matchScore != null && <span className="parcel-score-top">{Math.round(parcel.matchScore)}% match</span>}
      </div>
      <div className="parcel-body">
        <div className="parcel-location">{parcel.location || 'Kenya'}, {parcel.county || 'County'}</div>
        <div className="parcel-name">{parcel.title}</div>
        <div className="parcel-tags">
          <span className="parcel-tag">{parcel.sizeAcres} ac</span>
          <span className="parcel-tag">{parcel.crop}</span>
          {parcel.plotRating != null && <span className="parcel-tag">Rating {Number(parcel.plotRating).toFixed(1)}/5</span>}
          {(parcel.tags || []).map((t) => (
            <span className="parcel-tag" key={t}>{t}</span>
          ))}
        </div>
        <div className="parcel-footer">
          <div className="parcel-price">
            KES {Number(parcel.pricePerAcrePerSeason).toLocaleString()} <span>per ac per season</span>
          </div>
          <span className="parcel-btn">View details</span>
        </div>
      </div>
    </Link>
  );
}
