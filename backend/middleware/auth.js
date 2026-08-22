const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT and attaches req.user (full mongoose doc, minus passwordHash).
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to specific roles. Use after requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not permitted for this account type' });
    }
    next();
  };
}

// Gates "key actions" — applying to lease a parcel, publishing a listing, starting
// a chat with the other party — behind the standalone phone OTP check (see
// services/verification.js issuePhoneVerification). Use after requireAuth.
function requirePhoneVerified(req, res, next) {
  if (!req.user.phoneVerified) {
    return res.status(403).json({
      error: 'Please verify your phone number before continuing.',
      code: 'PHONE_NOT_VERIFIED',
    });
  }
  next();
}

// Gates the same key actions behind a verified national ID — buyers (farmers)
// before they can apply to lease, sellers (landowners) before they can publish a
// listing. Use after requireAuth.
function requireIdVerified(req, res, next) {
  if (!req.user.idVerification || req.user.idVerification.status !== 'verified') {
    return res.status(403).json({
      error: 'Please submit your national ID for verification before continuing.',
      code: 'ID_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = { requireAuth, requireRole, requirePhoneVerified, requireIdVerified };
