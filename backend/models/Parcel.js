const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    reference: { type: String, trim: true, maxlength: 60 },
    county: { type: String, required: true, trim: true, maxlength: 60, index: true },
    location: { type: String, required: true, trim: true, maxlength: 140 },
    sizeAcres: { type: Number, required: true, min: 0.1 },
    pricePerAcrePerSeason: { type: Number, required: true, min: 0 },
    crop: { type: String, required: true, trim: true, maxlength: 60, index: true },
    season: { type: String, trim: true, maxlength: 40 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    description: { type: String, trim: true, maxlength: 4000 },
    photos: [{ type: String, trim: true }],
    financingAvailable: { type: Boolean, default: false },
    insured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['available', 'under_review', 'leased', 'unlisted'],
      default: 'available',
      index: true,
    },
  },
  { timestamps: true }
);

parcelSchema.index({ title: 'text', location: 'text', county: 'text', crop: 'text' });

module.exports = mongoose.model('Parcel', parcelSchema);
