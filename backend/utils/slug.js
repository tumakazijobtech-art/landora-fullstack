// Builds the human readable slug used in parcel URLs, e.g.
// "landora-farm-long-rains-2026" from a title and a season. A short random suffix is
// appended so two listings that share a title and season never collide.
function slugifyPart(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(length = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function buildSlug(title, season) {
  const base = [slugifyPart(title), slugifyPart(season)].filter(Boolean).join('-');
  const trimmedBase = base.slice(0, 70).replace(/-+$/g, '');
  return `${trimmedBase || 'parcel'}-${randomSuffix()}`;
}

module.exports = { buildSlug, slugifyPart };
