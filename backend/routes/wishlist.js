const express = require('express');
const Parcel = require('../models/Parcel');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Any logged-in user (farmer, landowner, or admin) can save a listing to their
// wishlist for later. Stored as an array of Parcel ids on the User document.
router.use(requireAuth);

// List my saved parcels, most-recently-saved first.
router.get('/', async (req, res) => {
  const ids = [...(req.user.wishlist || [])].reverse();
  const parcels = await Parcel.find({ _id: { $in: ids } }).populate('owner', 'name county profilePicture');
  // Preserve the most-recently-saved-first order from the user's wishlist array.
  const order = new Map(ids.map((id, i) => [id.toString(), i]));
  parcels.sort((a, b) => (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0));
  res.json({ parcels, ids: ids.map((id) => id.toString()) });
});

// Save a parcel.
router.post('/:parcelId', async (req, res) => {
  const parcel = await Parcel.findById(req.params.parcelId).select('_id');
  if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

  const already = req.user.wishlist.some((id) => id.toString() === req.params.parcelId);
  if (!already) {
    req.user.wishlist.push(parcel._id);
    await req.user.save();
  }
  res.json({ ok: true, wishlist: req.user.wishlist.map((id) => id.toString()) });
});

// Remove a parcel from the wishlist.
router.delete('/:parcelId', async (req, res) => {
  req.user.wishlist = req.user.wishlist.filter((id) => id.toString() !== req.params.parcelId);
  await req.user.save();
  res.json({ ok: true, wishlist: req.user.wishlist.map((id) => id.toString()) });
});

module.exports = router;
