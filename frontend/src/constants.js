// All 47 counties of Kenya, kept in one place since both the marketplace filter bar
// and Landora Match need the same list.
export const COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 'Garissa', 'Wajir',
  'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos',
  'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', 'Murang\u2019a', 'Kiambu', 'Turkana',
  'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega',
  'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii',
  'Nyamira', 'Nairobi',
];

export const WITHIN_OPTIONS = [
  { label: '5km', value: '5' },
  { label: '10km', value: '10' },
  { label: '20km', value: '20' },
  { label: '50km', value: '50' },
  { label: 'Any distance', value: '' },
];

export const SCORE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-'];

// Logo icon shown in the navbar. This is the deploy-time default only — an admin can
// override both the app icon and the square app logo at runtime from the Branding tab
// in /admin (see branding.js), which takes priority over this env value.
export const LOGO_URL = import.meta.env.VITE_LOGO_URL || '/logo.svg';
