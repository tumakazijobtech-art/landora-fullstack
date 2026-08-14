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
      </div>
      <div className="parcel-body">
        <div className="parcel-location">{parcel.location}, {parcel.county}</div>
        <div className="parcel-name">{parcel.title}</div>
        <div className="parcel-tags">
          <span className="parcel-tag">{parcel.sizeAcres} ac</span>
          <span className="parcel-tag">{parcel.crop}</span>
          {(parcel.tags || []).map((t) => (
            <span className="parcel-tag" key={t}>{t}</span>
          ))}
        </div>
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
