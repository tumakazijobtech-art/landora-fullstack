const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    parcel: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel', required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    landowner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    intendedCrop: { type: String, trim: true, maxlength: 80 },
    seasonsRequested: { type: Number, min: 1, max: 20, default: 1 },
    message: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    landownerNote: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// A farmer can only have one active (pending/accepted) application per parcel.
applicationSchema.index({ parcel: 1, farmer: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
