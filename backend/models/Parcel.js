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
    landUse: { type: String, trim: true, maxlength: 80, index: true },
    season: { type: String, trim: true, maxlength: 40 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    description: { type: String, trim: true, maxlength: 4000 },
    photos: [{ type: String, trim: true, maxlength: 500 }],
    plotRating: { type: Number, min: 0, max: 5, default: null },
    matchScore: { type: Number, min: 0, max: 100, default: null },
    keyFacts: [
      {
        label: { type: String, trim: true, maxlength: 80 },
        value: { type: String, trim: true, maxlength: 240 },
      },
    ],
    keyFactsVerified: { type: Boolean, default: false },
    keyFactsVerifiedBy: { type: String, trim: true, maxlength: 160 },
    gisReportStatus: {
      type: String,
      enum: ['not_started', 'queued', 'completed', 'needs_review'],
      default: 'not_started',
    },
    parcelMapUrl: { type: String, trim: true, maxlength: 800 },
    parcelMapSource: { type: String, trim: true, maxlength: 160 },
    videoUrl: { type: String, trim: true, maxlength: 800 },
    ministryVerification: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'manual_review', 'not_verified'],
        default: 'pending',
      },
      method: {
        type: String,
        enum: ['pending', 'Ardhisasa', 'Manual search'],
        default: 'pending',
      },
      reference: { type: String, trim: true, maxlength: 120 },
      checkedAt: { type: Date },
      checkedBy: { type: String, trim: true, maxlength: 120 },
      notes: { type: String, trim: true, maxlength: 500 },
    },
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
