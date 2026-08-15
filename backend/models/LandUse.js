const mongoose = require('mongoose');

// Land use options are managed by admins from the backend and power the crop/land-use
// dropdowns on listing creation, marketplace filters, and Landora Match — instead of
// being hardcoded in the frontend.
const landUseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

landUseSchema.index({ sortOrder: 1, name: 1 });

module.exports = mongoose.model('LandUse', landUseSchema);
