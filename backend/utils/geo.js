// Approximate centroids for the counties Landora currently lists in. Used by Landora
// Match ("Near <county>, within <radius>") to rank/filter parcels that don't share an
// exact county string but do fall within range, once a parcel has GIS map data.
const COUNTY_CENTROIDS = {
  Nairobi: { lat: -1.2864, lng: 36.8172 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  Nyeri: { lat: -0.4201, lng: 36.9476 },
  'Uasin Gishu': { lat: 0.5143, lng: 35.2698 },
  Meru: { lat: 0.0463, lng: 37.6559 },
  Nyandarua: { lat: -0.336, lng: 36.5225 },
  Kiambu: { lat: -1.1714, lng: 36.8356 },
  Kisumu: { lat: -0.0917, lng: 34.768 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
};

function countyCentroid(county) {
  return COUNTY_CENTROIDS[county] || null;
}

// Haversine distance in kilometres between two lat/lng points.
function distanceKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports = { COUNTY_CENTROIDS, countyCentroid, distanceKm };
