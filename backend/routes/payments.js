const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const FeeSettings = require('../models/FeeSettings');
const Application = require('../models/Application');
const Parcel = require('../models/Parcel');
const { requireAuth } = require('../middleware/auth');
const mpesa = require('../services/mpesa');
const { activateFromPayment } = require('../services/subscriptions');

const router = express.Router();

// Computes the amount (in KES) for a payment type from the live, admin-editable
// FeeSettings singleton — this is the one place the business model's fee logic is
// implemented, so every payment (commission, verification, lease contract,
// subscriptions) always reflects whatever the admin dashboard currently has saved.
async function resolveAmount(type, tier, { application, parcel, county }, fees) {
  switch (type) {
    case 'commission': {
      // §1 — a percentage of the first year's lease value, bounded by min/max.
      if (!parcel) throw Object.assign(new Error('A parcel is required for a commission payment'), { status: 400 });
      const annualValue = Number(parcel.pricePerAcrePerSeason || 0) * Number(parcel.sizeAcres || 0);
      const raw = (annualValue * Number(fees.commission.percent || 0)) / 100;
      const amount = Math.min(Math.max(raw, fees.commission.minKes), fees.commission.maxKes || raw);
      return { amount: Math.round(amount), description: 'Landora lease commission' };
    }
    case 'verification': {
      // §2 — flat fee, basic or premium tier.
      const premium = tier === 'premium';
      return {
        amount: premium ? fees.verification.premiumKes : fees.verification.basicKes,
        description: premium ? 'Premium land verification' : 'Basic land verification',
      };
    }
    case 'lease_contract': {
      // §3 — flat fee, basic or professional tier.
      const pro = tier === 'professional';
      return {
        amount: pro ? fees.leaseContract.professionalKes : fees.leaseContract.basicKes,
        description: pro ? 'Professional lease contract' : 'Basic lease contract',
      };
    }
    case 'landowner_subscription': {
      // §4 — flat monthly fee per plan tier.
      const plan = ['individual', 'multiProperty', 'institutional'].includes(tier) ? tier : 'individual';
      const key = `${plan}Kes`;
      return { amount: fees.landownerSubscription[key], description: `Landowner subscription (${plan})` };
    }
    case 'farmer_premium': {
      // §5 — flat monthly fee.
      return { amount: fees.farmerPremium.monthlyKes, description: 'Farmer premium subscription' };
    }
    case 'intelligence_report': {
      // §6 — flat fee per county/crop report.
      return {
        amount: fees.intelligence.reportFeeKes,
        description: `Land intelligence report — ${county || 'region'}`,
      };
    }
    default:
      throw Object.assign(new Error('Unknown payment type'), { status: 400 });
  }
}

// Farmer/landowner: start an M-Pesa "Lipa na M-Pesa" prompt for one of the platform's
// fees. The amount is never trusted from the client — it is always recomputed here
// from FeeSettings, so a tampered request body can't change what gets charged.
router.post(
  '/initiate',
  requireAuth,
  [
    body('type').isIn(['commission', 'verification', 'lease_contract', 'landowner_subscription', 'farmer_premium', 'intelligence_report']),
    body('tier').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('applicationId').optional({ checkFalsy: true }).isMongoId(),
    body('parcelId').optional({ checkFalsy: true }).isMongoId(),
    body('county').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('crop').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    body('phone').trim().isLength({ min: 9, max: 15 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { type, tier, applicationId, parcelId, phone } = req.body;
    const county = req.body.county ? req.body.county.trim() : undefined;
    const crop = req.body.crop ? req.body.crop.trim() : undefined;

    if (type === 'intelligence_report' && !county) {
      return res.status(400).json({ error: 'Choose a county to buy a report for' });
    }

    let application = null;
    let parcel = null;

    if (applicationId) {
      application = await Application.findById(applicationId).populate('parcel');
      if (!application) return res.status(404).json({ error: 'Application not found' });
      const isParty = [String(application.farmer), String(application.landowner)].includes(String(req.user._id));
      if (!isParty && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not permitted to pay for this application' });
      }
      parcel = application.parcel;
    } else if (parcelId) {
      parcel = await Parcel.findById(parcelId);
      if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
      const isOwner = String(parcel.owner) === String(req.user._id);
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not permitted to pay for this listing' });
      }
    }

    const fees = await FeeSettings.getSingleton();
    let amount, description;
    try {
      ({ amount, description } = await resolveAmount(type, tier, { application, parcel, county }, fees));
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'This fee is not currently configured — ask an admin to set it under Fees & Payments' });
    }

    const accountReference = `${fees.mpesa.accountReferencePrefix || 'LANDORA'}-${type.slice(0, 4).toUpperCase()}`;

    const payment = await Payment.create({
      user: req.user._id,
      type,
      tier: tier || undefined,
      application: application ? application._id : undefined,
      parcel: parcel ? parcel._id : undefined,
      county,
      crop,
      amount,
      phone,
      accountReference,
      description,
      status: 'pending',
    });

    try {
      const stkResult = await mpesa.stkPush({
        shortcode: fees.mpesa.shortcode,
        tillNumber: fees.mpesa.tillNumber,
        phone,
        amount,
        accountReference,
        description,
      });

      if (String(stkResult.ResponseCode) !== '0') {
        payment.status = 'failed';
        payment.resultDesc = stkResult.ResponseDescription || stkResult.errorMessage || 'STK push was not accepted';
        await payment.save();
        return res.status(502).json({ error: payment.resultDesc, payment });
      }

      payment.merchantRequestId = stkResult.MerchantRequestID;
      payment.checkoutRequestId = stkResult.CheckoutRequestID;
      payment.phone = stkResult.normalizedPhone || payment.phone;
      await payment.save();

      res.status(201).json({ payment });
    } catch (err) {
      payment.status = 'failed';
      payment.resultDesc = (err.response && err.response.data && (err.response.data.errorMessage || err.response.data.error_description)) || err.message;
      await payment.save();
      return res.status(502).json({ error: payment.resultDesc, payment });
    }
  }
);

// Safaricom calls this after the customer accepts/cancels/times out the STK prompt.
// Public by design (Daraja cannot authenticate as a Landora user) — the only thing
// trusted from the body is matched against a CheckoutRequestID we generated
// ourselves, so nothing here lets an outsider forge a payment for an
// unrelated pending request.
router.post('/mpesa/callback', async (req, res) => {
  const stkCallback = req.body && req.body.Body && req.body.Body.stkCallback;
  // Always 200 an empty ack even on malformed input — Safaricom retries aggressively
  // on non-200s, which would just spam this endpoint.
  if (!stkCallback || !stkCallback.CheckoutRequestID) {
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  const payment = await Payment.findOne({ checkoutRequestId: stkCallback.CheckoutRequestID });
  if (!payment) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  const wasAlreadySuccess = payment.status === 'success';

  payment.rawCallback = stkCallback;
  payment.resultCode = stkCallback.ResultCode;
  payment.resultDesc = stkCallback.ResultDesc;

  if (Number(stkCallback.ResultCode) === 0) {
    const items = (stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) || [];
    const find = (name) => items.find((i) => i.Name === name);
    payment.mpesaReceiptNumber = find('MpesaReceiptNumber') && find('MpesaReceiptNumber').Value;
    const txDate = find('TransactionDate') && find('TransactionDate').Value;
    if (txDate) {
      const s = String(txDate);
      payment.transactionDate = new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`
      );
    }
    payment.status = 'success';
  } else if (Number(stkCallback.ResultCode) === 1032) {
    payment.status = 'cancelled'; // user cancelled the prompt on their phone
  } else {
    payment.status = 'failed';
  }

  await payment.save();
  // A subscription payment (landowner plan or farmer premium) activates/extends the
  // plan the instant it succeeds — guarded so a retried/duplicate callback can never
  // grant a second period for the same payment.
  if (!wasAlreadySuccess && payment.status === 'success') {
    await activateFromPayment(payment);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Farmer/landowner: poll a payment they initiated. If the callback hasn't landed yet
// (common in local dev, where Safaricom can't reach localhost) this also queries
// Safaricom directly and updates the record before responding.
router.get('/:id/status', requireAuth, async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (String(payment.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not permitted to view this payment' });
  }

  if (payment.status === 'pending' && payment.checkoutRequestId) {
    try {
      const fees = await FeeSettings.getSingleton();
      const result = await mpesa.stkQuery({ shortcode: fees.mpesa.shortcode, checkoutRequestId: payment.checkoutRequestId });
      const code = Number(result.ResultCode);
      if (code === 0) {
        payment.status = 'success';
        payment.resultDesc = result.ResultDesc;
      } else if (code === 1032) {
        payment.status = 'cancelled';
        payment.resultDesc = result.ResultDesc;
      } else if (!Number.isNaN(code)) {
        payment.status = 'failed';
        payment.resultDesc = result.ResultDesc;
      }
      // ResultCode 1037/2001-style "still processing" responses leave status as
      // pending — the UI will poll again shortly.
      if (payment.isModified()) await payment.save();
      // The status guard above guarantees this payment was still 'pending' before
      // this poll, so a transition to 'success' here can only happen once.
      if (payment.status === 'success') {
        await activateFromPayment(payment);
      }
    } catch {
      // Query failed (e.g. Safaricom rate limit) — fall through and return whatever
      // we already have; the frontend will retry.
    }
  }

  res.json({ payment });
});

// Farmer/landowner: my own payment history, most recent first.
router.get('/mine', requireAuth, async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('parcel', 'title county')
    .populate('application', 'status')
    .lean();
  res.json({ payments });
});

module.exports = router;
