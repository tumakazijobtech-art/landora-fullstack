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

// Tabbed media viewer for a listing: Photos, Video, Property map, and Local map.
// The tab bar pattern is a familiar one from land listing sites, but everything
// rendered inside each tab is this project's own data and its own components
// (the image slider, the SVG parcel map, the SVG local overview) — no outside
// photography or map tiles are pulled in anywhere.
export default function MediaTabs({ photos, altPrefix, video, posterFallback, map, county, location }) {
  const hasVideo = Boolean(video && video.url);
  const embed = hasVideo ? getVideoEmbed(video.url) : null;

  const tabs = [
    { key: 'photos', label: 'Photos' },
    ...(hasVideo ? [{ key: 'video', label: 'Video' }] : []),
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
        {current === 'photos' && <ImageSlider images={photos} altPrefix={altPrefix} />}

        {current === 'video' && hasVideo && embed && (
          <div className="video-frame">
            {embed.type === 'iframe' ? (
              <iframe
                src={embed.src}
                title={video.caption || 'Parcel video walkthrough'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
              />
            ) : (
              <video controls poster={posterFallback} src={embed.src} />
            )}
            {video.durationLabel && <span className="video-duration">{video.durationLabel}</span>}
          </div>
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

      {current === 'video' && video?.caption && (
        <div style={{ fontWeight: 600, fontSize: 13, marginTop: 10 }}>{video.caption}</div>
      )}
    </div>
  );
}
