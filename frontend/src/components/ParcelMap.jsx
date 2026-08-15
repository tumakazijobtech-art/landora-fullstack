import React, { useMemo, useState } from 'react';

const VIEW = 520;
const PAD = 40;

// Simple equirectangular projection around the parcel centroid — plenty accurate at
// the scale of a single parcel — scaled to fit the SVG viewBox.
function project(points, centroid) {
  if (!points || points.length === 0) return [];
  const latScale = 111320; // metres per degree latitude
  const lngScale = 111320 * Math.cos((centroid.lat * Math.PI) / 180);
  const xy = points.map((p) => ({
    x: (p.lng - centroid.lng) * lngScale,
    y: -(p.lat - centroid.lat) * latScale, // screen y grows downward
  }));
  const xs = xy.map((p) => p.x);
  const ys = xy.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const span = Math.max(spanX, spanY);
  const scale = (VIEW - PAD * 2) / span;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return xy.map((p) => ({
    x: VIEW / 2 + (p.x - cx) * scale,
    y: VIEW / 2 + (p.y - cy) * scale,
  }));
}

export default function ParcelMap({ mapData }) {
  const [showRoad, setShowRoad] = useState(true);
  const [showStream, setShowStream] = useState(true);

  const hasBoundary = mapData && Array.isArray(mapData.boundaryPoints) && mapData.boundaryPoints.length >= 3;
  const centroid = mapData && mapData.centroidLat != null
    ? { lat: mapData.centroidLat, lng: mapData.centroidLng }
    : null;

  const boundaryXY = useMemo(
    () => (hasBoundary && centroid ? project(mapData.boundaryPoints, centroid) : []),
    [mapData, hasBoundary, centroid]
  );
  const streamXY = useMemo(
    () => (mapData && mapData.streamPoints && centroid ? project(mapData.streamPoints, centroid) : []),
    [mapData, centroid]
  );
  const roadXY = useMemo(
    () => (mapData && mapData.roadPoints && centroid ? project(mapData.roadPoints, centroid) : []),
    [mapData, centroid]
  );

  if (!hasBoundary) {
    return (
      <div className="map-empty">
        The parcel boundary is being finalised by the GIS engine and will appear here shortly.
      </div>
    );
  }

  const boundaryPath = boundaryXY.map((p) => `${p.x},${p.y}`).join(' ');
  const streamPath = streamXY.map((p) => `${p.x},${p.y}`).join(' ');
  const roadPath = roadXY.map((p) => `${p.x},${p.y}`).join(' ');
  const center = boundaryXY.reduce((acc, p) => ({ x: acc.x + p.x / boundaryXY.length, y: acc.y + p.y / boundaryXY.length }), { x: 0, y: 0 });

  return (
    <div>
      <div className="map-legend">
        <span className="map-legend-item"><span className="map-swatch map-swatch-boundary" /> Leased boundary</span>
        {streamXY.length > 0 && (
          <span className="map-legend-item"><span className="map-swatch map-swatch-stream" /> Seasonal stream</span>
        )}
        {roadXY.length > 0 && (
          <span className="map-legend-item"><span className="map-swatch map-swatch-road" /> Access road</span>
        )}
        <span className="map-legend-item"><span className="map-swatch map-swatch-centroid" /> Parcel centroid</span>
        <div style={{ flex: 1 }} />
        {roadXY.length > 0 && (
          <button className={`map-toggle ${showRoad ? 'active' : ''}`} onClick={() => setShowRoad((v) => !v)}>Roads</button>
        )}
        {streamXY.length > 0 && (
          <button className={`map-toggle ${showStream ? 'active' : ''}`} onClick={() => setShowStream((v) => !v)}>Stream</button>
        )}
      </div>

      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="map-svg" role="img" aria-label="Parcel boundary map">
        <rect x="0" y="0" width={VIEW} height={VIEW} fill="var(--g50)" />
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i * VIEW) / 6} x2={VIEW} y2={(i * VIEW) / 6} stroke="var(--s100)" strokeWidth="1" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * VIEW) / 6} y1="0" x2={(i * VIEW) / 6} y2={VIEW} stroke="var(--s100)" strokeWidth="1" />
        ))}

        {showRoad && roadXY.length > 1 && (
          <polyline points={roadPath} fill="none" stroke="var(--s200)" strokeWidth="6" strokeLinecap="round" />
        )}

        <polygon points={boundaryPath} fill="var(--g200)" fillOpacity="0.55" stroke="var(--g600)" strokeWidth="2" strokeDasharray="6 4" />

        {showStream && streamXY.length > 1 && (
          <polyline points={streamPath} fill="none" stroke="#4A90C4" strokeWidth="3" />
        )}

        <circle cx={center.x} cy={center.y} r="6" fill="var(--o500)" stroke="var(--w)" strokeWidth="2" />
      </svg>

      {mapData.centroidLat != null && (
        <div className="map-coords">{mapData.centroidLat.toFixed(4)}° N, {mapData.centroidLng.toFixed(4)}° E</div>
      )}
      {mapData.sourceNote && <div className="map-source-note">{mapData.sourceNote}</div>}
    </div>
  );
}
