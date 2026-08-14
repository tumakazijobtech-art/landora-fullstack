const Setting = require('../models/Setting');

const DEFAULT_LAND_USE_OPTIONS = [
  'Crop production',
  'Horticulture',
  'Livestock grazing',
  'Agroforestry',
  'Mixed farming',
  'Conservation',
];

async function getLandUseOptions() {
  const setting = await Setting.findOneAndUpdate(
    { key: 'landUseOptions' },
    { $setOnInsert: { values: DEFAULT_LAND_USE_OPTIONS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return setting.values?.length ? setting.values : DEFAULT_LAND_USE_OPTIONS;
}

module.exports = { DEFAULT_LAND_USE_OPTIONS, getLandUseOptions };