import React, { useState } from 'react';
import ImageSlider from './ImageSlider.jsx';
import ParcelMap from './ParcelMap.jsx';
import LocalMapView from './LocalMapView.jsx';

// The video walkthrough URL an admin pastes in could be a direct file (.mp4) or a
// link to YouTube/Vimeo — those only play through their embed iframe, not a native
// <video> tag, which is why a YouTube link previously just showed a broken player.
function getVideoEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop();
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.replace('/', '');
      if (id) return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    // Not a valid absolute URL — fall through to treating it as a direct file below.
  }
  return { type: 'file', src: url };
}

// Tabbed media viewer for a listing: Photos (which opens with the video walkthrough
// as its first slide when one exists), Property map, and Local map. Folding the
// video into the photo slider means a visitor sees it while browsing rather than
// needing to know a separate tab exists for it.
export default function MediaTabs({ photos, altPrefix, video, posterFallback, map, county, location }) {
  const hasVideo = Boolean(video && video.url);
  const embed = hasVideo ? getVideoEmbed(video.url) : null;

  const tabs = [
    { key: 'photos', label: 'Photos' },
    { key: 'map', label: 'Property map' },
    { key: 'local', label: 'Local map' },
  ];

  const [active, setActive] = useState('photos');
  const current = tabs.some((t) => t.key === active) ? active : 'photos';

  return (
    <div className="media-tabs">
      <div className="media-tabbar" role="tablist" aria-label="Listing media">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={current === t.key}
            className={`media-tab ${current === t.key ? 'active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="media-tab-panel">
        {current === 'photos' && (
          <ImageSlider
            images={photos}
            altPrefix={altPrefix}
            video={hasVideo ? { embed, poster: posterFallback, caption: video.caption, durationLabel: video.durationLabel } : null}
          />
        )}

        {current === 'map' && (
          <div className="media-map-frame">
            <ParcelMap mapData={map} />
          </div>
        )}

        {current === 'local' && (
          <div className="media-map-frame">
            <LocalMapView county={county} location={location} centroidLat={map?.centroidLat} centroidLng={map?.centroidLng} />
          </div>
        )}
      </div>
    </div>
  );
}
