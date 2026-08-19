import { cacheGet, cacheSet, cacheInvalidate } from './cache.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, token, cacheTtlMs } = {}) {
  const cacheKey = `${method}:${path}`;

  // Serve straight from the client-side cache when this call opted in and nothing has
  // invalidated it yet — skips the network entirely for repeat views of the same data.
  if (method === 'GET' && cacheTtlMs) {
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) return cached;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Landora could not reach the API. Check that the backend is running and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // No JSON body (e.g. 204) — that's fine.
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (method === 'GET' && cacheTtlMs) {
    cacheSet(cacheKey, data, cacheTtlMs);
  }

  return data;
}

// TTLs mirror the server-side cache in backend/middleware/cache.js — short enough
// that a new listing or a price edit shows up quickly, long enough that browsing the
// marketplace or flipping back to a listing you already opened doesn't refetch.
const LIST_TTL_MS = 30 * 1000;
const DETAIL_TTL_MS = 60 * 1000;
const LAND_USES_TTL_MS = 5 * 60 * 1000;

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  resendVerification: (payload) => request('/auth/verification/resend', { method: 'POST', body: payload }),
  confirmVerification: (payload) => request('/auth/verification/confirm', { method: 'POST', body: payload }),
  requestPasswordReset: (payload) => request('/auth/forgot-password/request', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/forgot-password/reset', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  updateProfile: (payload, token) => request('/auth/profile', { method: 'PATCH', body: payload, token }),

  listParcels: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/parcels${qs ? `?${qs}` : ''}`, { cacheTtlMs: LIST_TTL_MS });
  },
  getParcel: (id) => request(`/parcels/${id}`, { cacheTtlMs: DETAIL_TTL_MS }),
  createParcel: (payload, token) =>
    request('/parcels', { method: 'POST', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),
  updateParcel: (id, payload, token) =>
    request(`/parcels/${id}`, { method: 'PATCH', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),
  deleteParcel: (id, token) =>
    request(`/parcels/${id}`, { method: 'DELETE', token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),
  myParcels: (token) => request('/parcels/mine/list', { token }),

  applyToParcel: (payload, token) => request('/applications', { method: 'POST', body: payload, token }),
  myApplications: (token) => request('/applications/mine', { token }),
  receivedApplications: (token, parcelId) =>
    request(`/applications/received${parcelId ? `?parcelId=${parcelId}` : ''}`, { token }),

  // Wishlist / saved listings — available to any logged-in role.
  getWishlist: (token) => request('/wishlist', { token }),
  addToWishlist: (parcelId, token) => request(`/wishlist/${parcelId}`, { method: 'POST', token }),
  removeFromWishlist: (parcelId, token) => request(`/wishlist/${parcelId}`, { method: 'DELETE', token }),

  // Land use taxonomy — adaptable via the admin backend, powers the crop/land-use
  // dropdowns on listing creation, marketplace filters, and Landora Match.
  landUses: () => request('/land-uses', { cacheTtlMs: LAND_USES_TTL_MS }),
  allLandUses: (token) => request('/land-uses/all', { token }),
  createLandUse: (payload, token) =>
    request('/land-uses', { method: 'POST', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/land-uses');
      return data;
    }),
  updateLandUse: (id, payload, token) =>
    request(`/land-uses/${id}`, { method: 'PATCH', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/land-uses');
      return data;
    }),
  deleteLandUse: (id, token) =>
    request(`/land-uses/${id}`, { method: 'DELETE', token }).then((data) => {
      cacheInvalidate('GET:/land-uses');
      return data;
    }),

  // Admin: listing management, including the internal key-facts/productivity-report/
  // map/video-walkthrough enrichment pass.
  adminParcels: (token) => request('/admin/parcels', { token }),
  adminGetParcel: (id, token) => request(`/admin/parcels/${id}`, { token }),
  adminAuthSettings: (token) => request('/admin/auth-settings', { token }),
  updateAdminAuthSettings: (payload, token) =>
    request('/admin/auth-settings', { method: 'PATCH', body: payload, token }),
  adminUpdateParcel: (id, payload, token) =>
    request(`/admin/parcels/${id}`, { method: 'PATCH', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),
  adminEnrichParcel: (id, payload, token) =>
    request(`/admin/parcels/${id}/enrich`, { method: 'PATCH', body: payload, token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),
  adminDeleteParcel: (id, token) =>
    request(`/admin/parcels/${id}`, { method: 'DELETE', token }).then((data) => {
      cacheInvalidate('GET:/parcels');
      return data;
    }),

  // Admin: the applicant qualification queue. The admin is the one who accepts or
  // declines lease applicants — landowners can only view them (see receivedApplications).
  adminApplications: (token, params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/applications${qs ? `?${qs}` : ''}`, { token });
  },
  adminDecideApplication: (id, payload, token) =>
    request(`/admin/applications/${id}/decision`, { method: 'PATCH', body: payload, token }),
  adminWithdrawApplication: (id, token) =>
    request(`/admin/applications/${id}/withdraw`, { method: 'PATCH', token }),

  // Join the waitlist popup, and parcel level pre booking — public, no login needed.
  joinWaitlist: (payload) => request('/waitlist', { method: 'POST', body: payload }),
  adminWaitlist: (token, params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/waitlist${qs ? `?${qs}` : ''}`, { token });
  },
  adminUpdateWaitlistEntry: (id, payload, token) =>
    request(`/admin/waitlist/${id}`, { method: 'PATCH', body: payload, token }),

  // A fair lease rate suggestion for the landowner pricing calculator, based on what
  // comparable listings are actually asking for right now.
  pricingSuggestion: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/parcels/pricing-suggestion${qs ? `?${qs}` : ''}`);
  },

  // M-Pesa payments — commission, verification, digital lease contracts, and
  // subscriptions. The amount is always computed server-side from the admin's fee
  // settings; the client never sends one. See backend/routes/payments.js.
  initiatePayment: (payload, token) => request('/payments/initiate', { method: 'POST', body: payload, token }),
  getPaymentStatus: (id, token) => request(`/payments/${id}/status`, { token }),
  myPayments: (token) => request('/payments/mine', { token }),

  // Subscription gating — a user's own active landowner/farmer plan, and the
  // premium-only farmer price analytics view. See backend/services/subscriptions.js
  // for how a plan is derived from payment history.
  mySubscriptions: (token) => request('/subscriptions/mine', { token }),
  priceAnalytics: (token) => request('/parcels/price-analytics', { token }),

  // Land price intelligence (§6) — a free marketplace-wide teaser, plus paid,
  // time-limited reports per county/crop. See backend/routes/intelligence.js.
  intelligenceSummary: () => request('/intelligence/summary'),
  intelligenceReport: (params, token) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/intelligence/report${qs ? `?${qs}` : ''}`, { token });
  },

  // Financing & insurance referrals (§8/§9) — Landora doesn't lend/underwrite, just
  // connects users to partners and tracks the introduction through to commission.
  referralPartners: (type, token) => request(`/referrals/partners${type ? `?type=${type}` : ''}`, { token }),
  createReferral: (payload, token) => request('/referrals', { method: 'POST', body: payload, token }),
  myReferrals: (token) => request('/referrals/mine', { token }),

  // Admin: manage the partner list and move referral requests through to a recorded
  // commission once the partner actually pays out.
  adminReferralPartners: (token) => request('/admin/referral-partners', { token }),
  adminCreateReferralPartner: (payload, token) => request('/admin/referral-partners', { method: 'POST', body: payload, token }),
  adminUpdateReferralPartner: (id, payload, token) => request(`/admin/referral-partners/${id}`, { method: 'PATCH', body: payload, token }),
  adminDeleteReferralPartner: (id, token) => request(`/admin/referral-partners/${id}`, { method: 'DELETE', token }),
  adminReferrals: (token, params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/referrals${qs ? `?${qs}` : ''}`, { token });
  },
  adminUpdateReferral: (id, payload, token) => request(`/admin/referrals/${id}`, { method: 'PATCH', body: payload, token }),

  // Institutional/agribusiness bulk land search (§7) — "find us N acres matching
  // these criteria." An admin compiles a proposal; the buyer pays an aggregation
  // fee to unlock it. See backend/routes/bulkSearch.js.
  submitBulkSearch: (payload, token) => request('/bulk-search', { method: 'POST', body: payload, token }),
  myBulkSearchRequests: (token) => request('/bulk-search/mine', { token }),
  adminBulkSearchRequests: (token, params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/bulk-search${qs ? `?${qs}` : ''}`, { token });
  },
  adminUpdateBulkSearch: (id, payload, token) => request(`/admin/bulk-search/${id}`, { method: 'PATCH', body: payload, token }),

  // Admin: platform-wide fee configuration (commission %, verification/lease-contract
  // prices, subscription tiers, and the M-Pesa till/shortcode) and the full payment
  // ledger.
  adminFeeSettings: (token) => request('/admin/fee-settings', { token }),
  updateAdminFeeSettings: (payload, token) =>
    request('/admin/fee-settings', { method: 'PATCH', body: payload, token }),
  adminPayments: (token, params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/payments${qs ? `?${qs}` : ''}`, { token });
  },
};
