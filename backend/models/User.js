const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['farmer', 'landowner', 'admin'],
      required: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    county: { type: String, trim: true, maxlength: 60 },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    verificationPolicy: {
      requireOnSignup: { type: Boolean, default: false },
      requireOnSignIn: { type: Boolean, default: false },
    },
    verification: {
      purpose: { type: String, enum: ['signup', 'signin'], default: null },
      emailCodeHash: { type: String, default: null },
      phoneCodeHash: { type: String, default: null },
      emailCodeExpiresAt: { type: Date, default: null },
      phoneCodeExpiresAt: { type: Date, default: null },
    },
    passwordReset: {
      emailCodeHash: { type: String, default: null },
      phoneCodeHash: { type: String, default: null },
      emailCodeExpiresAt: { type: Date, default: null },
      phoneCodeExpiresAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.checkPassword = function checkPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    county: this.county,
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    verificationPolicy: this.verificationPolicy,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
