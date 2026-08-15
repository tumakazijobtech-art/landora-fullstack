const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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

  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  listParcels: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/parcels${qs ? `?${qs}` : ''}`);
  },
  getParcel: (id) => request(`/parcels/${id}`),
  createParcel: (payload, token) => request('/parcels', { method: 'POST', body: payload, token }),
  updateParcel: (id, payload, token) => request(`/parcels/${id}`, { method: 'PATCH', body: payload, token }),
  deleteParcel: (id, token) => request(`/parcels/${id}`, { method: 'DELETE', token }),
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
  landUses: () => request('/land-uses'),
  allLandUses: (token) => request('/land-uses/all', { token }),
  createLandUse: (payload, token) => request('/land-uses', { method: 'POST', body: payload, token }),
  updateLandUse: (id, payload, token) => request(`/land-uses/${id}`, { method: 'PATCH', body: payload, token }),
  deleteLandUse: (id, token) => request(`/land-uses/${id}`, { method: 'DELETE', token }),

  // Admin: listing management, including the internal key-facts/productivity-report/
  // map/video-walkthrough enrichment pass.
  adminParcels: (token) => request('/admin/parcels', { token }),
  adminGetParcel: (id, token) => request(`/admin/parcels/${id}`, { token }),
  adminUpdateParcel: (id, payload, token) => request(`/admin/parcels/${id}`, { method: 'PATCH', body: payload, token }),
  adminEnrichParcel: (id, payload, token) => request(`/admin/parcels/${id}/enrich`, { method: 'PATCH', body: payload, token }),
  adminDeleteParcel: (id, token) => request(`/admin/parcels/${id}`, { method: 'DELETE', token }),
};
