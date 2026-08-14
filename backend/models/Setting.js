const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    values: [{ type: String, trim: true, maxlength: 80 }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);