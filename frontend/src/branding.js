// Lets an admin swap in their own brand assets — a custom SVG app icon (used as the
// browser tab / PWA icon) and a square app logo (used in the navbar and other tight
// spots) — without a redeploy. Values are entered on the "Branding" tab of the admin
// dashboard, saved to this browser, and read from here everywhere a brand asset is
// shown. Env vars remain the deploy-time defaults for a fresh browser that has never
// saved an override.
const STORAGE_KEY = 'landora_branding_v1';
const EVENT_NAME = 'landora:branding-change';

const DEFAULTS = {
  appIconUrl: import.meta.env.VITE_APP_ICON_URL || '/logo.svg',
  appLogoUrl: import.meta.env.VITE_APP_LOGO_URL || import.meta.env.VITE_LOGO_URL || '/logo.svg',
};

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getBranding() {
  const stored = readStored();
  return {
    appIconUrl: (stored.appIconUrl || '').trim() || DEFAULTS.appIconUrl,
    appLogoUrl: (stored.appLogoUrl || '').trim() || DEFAULTS.appLogoUrl,
  };
}

export function getDefaultBranding() {
  return { ...DEFAULTS };
}

// Merges and persists a partial update, then notifies any listeners in this tab
// (storage events only fire in *other* tabs, so the navbar/favicon need a nudge here).
export function setBranding(partial) {
  const next = { ...readStored(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getBranding() }));
  return getBranding();
}

export function resetBranding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getBranding() }));
  return getBranding();
}

export function subscribeToBranding(callback) {
  function handler(event) {
    callback(event.detail || getBranding());
  }
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

// Points the browser tab / bookmark / PWA icon at the current app icon URL. Safe to
// call repeatedly — it reuses the same <link> tag instead of stacking new ones.
export function applyFavicon(url) {
  const href = url || getBranding().appIconUrl;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = href.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  link.href = href;
}
