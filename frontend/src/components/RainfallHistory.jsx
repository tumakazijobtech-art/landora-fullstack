import React from 'react';

export default function RainfallHistory({ seasons = [] }) {
  if (!seasons || seasons.length === 0) return null;
  const insurableCount = seasons.filter((s) => s.insurable).length;

  return (
    <div>
      <div className="rainfall-bars">
        {seasons.map((s, i) => (
          <div className="rainfall-bar-wrap" key={i}>
            <div className={`rainfall-bar ${s.insurable ? 'ok' : 'flag'}`} />
            <div className="rainfall-bar-label">{s.season}</div>
          </div>
        ))}
      </div>
      <div className="info-box" style={{ marginTop: 12, marginBottom: 0 }}>
        Rainfall has stayed within the insurable band for {insurableCount} of the {seasons.length} long rains seasons shown here, at this coordinate.
      </div>
    </div>
  );
}
