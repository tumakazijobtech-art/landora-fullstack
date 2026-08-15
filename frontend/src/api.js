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
  withdrawApplication: (id, token) => request(`/applications/${id}/withdraw`, { method: 'PATCH', token }),
  receivedApplications: (token, parcelId) =>
    request(`/applications/received${parcelId ? `?parcelId=${parcelId}` : ''}`, { token }),
  decideApplication: (id, payload, token) =>
    request(`/applications/${id}/decision`, { method: 'PATCH', body: payload, token }),

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
};
