import React from 'react';

// A stylised, procedurally drawn overview of the surrounding area. This intentionally
// does not pull in a real map tile provider or any outside imagery: it is plain SVG,
// coloured with the site's own palette, so there is nothing here that could raise a
// copyright question. The exact parcel boundary lives on the Property map tab, which
// is built from the parcel's own GIS coordinates.
export default function LocalMapView({ county, location, centroidLat, centroidLng }) {
  const placeLine = [location, county ? `${county} County` : null].filter(Boolean).join(', ');

  return (
    <div className="local-map">
      <svg viewBox="0 0 520 320" className="local-map-svg" role="img" aria-label="General overview of the surrounding area">
        <rect x="0" y="0" width="520" height="320" fill="var(--g50)" />

        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i * 320) / 7} x2="520" y2={(i * 320) / 7} stroke="var(--s100)" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * 520) / 11} y1="0" x2={(i * 520) / 11} y2="320" stroke="var(--s100)" strokeWidth="1" />
        ))}

        <path d="M0,235 C110,205 150,270 250,240 C350,210 420,265 520,230" fill="none" stroke="var(--s200)" strokeWidth="7" strokeLinecap="round" />
        <path d="M70,0 C95,80 45,160 95,320" fill="none" stroke="var(--s200)" strokeWidth="6" strokeLinecap="round" />
        <path d="M330,0 C300,70 360,150 320,320" fill="none" stroke="var(--s200)" strokeWidth="5" strokeLinecap="round" strokeOpacity="0.7" />

        <circle cx="260" cy="160" r="38" fill="none" stroke="var(--g300)" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="260" cy="160" r="76" fill="none" stroke="var(--g200)" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="260" cy="160" r="114" fill="none" stroke="var(--g100)" strokeWidth="1.5" strokeDasharray="4 4" />

        <circle cx="260" cy="160" r="7" fill="var(--o500)" stroke="var(--w)" strokeWidth="2" />
        <circle cx="260" cy="160" r="14" fill="none" stroke="var(--o400)" strokeWidth="1.5" strokeOpacity="0.6" />

        <g transform="translate(468,34)">
          <circle r="20" fill="var(--w)" stroke="var(--s200)" strokeWidth="1.5" />
          <text y="-6" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--s700)">N</text>
          <path d="M0,-11 L4,0 L0,4 L-4,0 Z" fill="var(--g600)" />
        </g>
      </svg>

      <div className="local-map-caption">
        {placeLine && <div className="local-map-place">{placeLine}</div>}
        {centroidLat != null && centroidLng != null && (
          <div className="local-map-coords">{centroidLat.toFixed(4)}° N, {centroidLng.toFixed(4)}° E</div>
        )}
        <div className="local-map-note">
          A general view of the surrounding area, drawn for orientation only and not to scale. See the Property map tab for the parcel's exact boundary.
        </div>
      </div>
    </div>
  );
}
