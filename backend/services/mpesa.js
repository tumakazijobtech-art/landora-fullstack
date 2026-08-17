const axios = require('axios');

// Thin wrapper around Safaricom's Daraja API for M-Pesa Express (STK Push), scoped to
// the "Buy Goods" (till) flow the platform uses to collect every fee — commission,
// verification, digital lease contracts, and subscriptions. Every call site goes
// through routes/payments.js, which is the only place that reads/writes the Payment
// model; this file only knows how to talk to Safaricom.
//
// Required environment variables (see backend/.env.example):
//   MPESA_ENV                sandbox | production (default sandbox)
//   MPESA_CONSUMER_KEY       Daraja app consumer key
//   MPESA_CONSUMER_SECRET    Daraja app consumer secret
//   MPESA_PASSKEY            Lipa Na M-Pesa Online passkey for the shortcode
//   MPESA_CALLBACK_URL       Publicly reachable URL Safaricom posts the result to
//                             (must be https in production)
//
// The till number (PartyB) and the business shortcode used to build the STK
// password are NOT environment variables — they live in FeeSettings.mpesa so an
// admin can change them from the dashboard without a redeploy/restart.

const MPESA_ENV = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
const BASE_URL = MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

// Normalizes any of the phone formats a Kenyan user might type (0712345678,
// 712345678, +254712345678, 254712345678) into the 2547XXXXXXXX / 2541XXXXXXXX
// format Daraja requires.
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `254${digits}`;
  return null; // caller treats this as invalid
}

function timestampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error('M-Pesa is not configured (missing MPESA_CONSUMER_KEY/MPESA_CONSUMER_SECRET)');
  }

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 15000,
  });

  cachedToken = data.access_token;
  // Daraja tokens last 3600s — refresh a minute early to be safe.
  cachedTokenExpiresAt = Date.now() + (Number(data.expires_in || 3599) - 60) * 1000;
  return cachedToken;
}

// Initiates an STK push ("Lipa na M-Pesa" prompt) on the customer's phone for a Buy
// Goods (till) payment. shortcode/tillNumber come from FeeSettings, not env, so they
// are admin-editable.
async function stkPush({ shortcode, tillNumber, phone, amount, accountReference, description }) {
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!passkey) throw new Error('M-Pesa is not configured (missing MPESA_PASSKEY)');
  if (!callbackUrl) throw new Error('M-Pesa is not configured (missing MPESA_CALLBACK_URL)');
  if (!shortcode) throw new Error('M-Pesa till/shortcode is not set — configure it in Admin → Fees & Payments');

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error('Enter a valid M-Pesa phone number, e.g. 0712345678');

  const timestamp = timestampNow();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const token = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    // Buy Goods online prompt, as opposed to CustomerPayBillOnline — this platform
    // collects every fee against a till number.
    TransactionType: 'CustomerBuyGoodsOnline',
    Amount: Math.max(1, Math.round(Number(amount))),
    PartyA: normalizedPhone,
    // PartyB is the till number receiving funds. Usually the same as the
    // BusinessShortCode for a Buy Goods till, but read independently in case
    // Safaricom ever issues them separately for this account.
    PartyB: tillNumber || shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: String(accountReference || 'LANDORA').slice(0, 12),
    TransactionDesc: String(description || 'Landora payment').slice(0, 13),
  };

  const { data } = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });

  return { ...data, normalizedPhone };
}

// Polls Safaricom directly for the outcome of a previous STK push — used as a
// fallback when the async callback hasn't arrived yet (e.g. local development,
// where Safaricom cannot reach a localhost CallBackURL).
async function stkQuery({ shortcode, checkoutRequestId }) {
  const passkey = process.env.MPESA_PASSKEY;
  if (!passkey) throw new Error('M-Pesa is not configured (missing MPESA_PASSKEY)');
  if (!shortcode) throw new Error('M-Pesa till/shortcode is not set');

  const timestamp = timestampNow();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );

  return data;
}

module.exports = { stkPush, stkQuery, normalizePhone };
