// Builds a parcel reference number in the same style as county cadastral references,
// e.g. "NKR/SBKIA/0442", when the landowner does not supply one at listing time.
function codeFromWords(text, length) {
  const letters = (text || '').toUpperCase().replace(/[^A-Z]/g, '');
  return (letters.slice(0, length) || 'XXX').padEnd(length, 'X');
}

function generateReference(county, location) {
  const countyCode = codeFromWords(county, 3);
  const locationCode = codeFromWords(location, 5);
  const serial = String(Math.floor(1000 + Math.random() * 9000));
  return `${countyCode}/${locationCode}/${serial}`;
}

module.exports = { generateReference };
