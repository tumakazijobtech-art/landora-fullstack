import React, { useState } from 'react';

// Five tabs mirror how a serious land listing gets explored in real life — wide shot,
// walk the ground, watch it move, check the paper boundary, then check what's around
// it — but everything shown is Landora's own report data, not a photo gallery, so it
// doubles as a preview of what a real parcel page contains.
const TABS = [
  {
    key: 'aerial',
    label: 'Aerial view',
    tabIcon: '◱',
    title: 'See the whole parcel from above first',
    copy: 'Satellite context and county boundaries before you ever leave the app — so a "4.5 acres in Subukia" isn\u2019t just a number.',
    image: '/assets/image_1786763049012.png',
    alt: 'Satellite view of a mapped land parcel',
    chip: 'Sentinel-2 · updated this season',
  },
  {
    key: 'ground',
    label: 'Ground walk',
    tabIcon: '⛰',
    title: 'Walk the terrain, not just the outline',
    copy: 'Field photos and a guided walk-through of access roads, tree cover, and slope — shot on the ground, not staged.',
    image: '/assets/image_1786763035226.png',
    alt: 'Woodland parcel view',
    chip: '12 field photos on this listing',
  },
  {
    key: 'video',
    label: 'Video walkthrough',
    tabIcon: '▶',
    title: 'Watch the boundary get walked in real time',
    copy: 'Every enriched listing ships with a short walkthrough video recorded with the landowner — boundary markers, water points, and access included.',
    image: '/assets/image_1786763042958.png',
    alt: 'Video walkthrough preview',
    chip: '3:42 · with landowner narration',
    isVideo: true,
  },
  {
    key: 'map',
    label: 'Boundary map',
    tabIcon: '⛶',
    title: 'A GIS boundary you can actually check',
    copy: 'Cadastral references cross-checked against OpenStreetMap and satellite imagery, with streams and access roads plotted alongside the plot edge.',
    image: '/assets/image_1786763055167.png',
    alt: 'Parcel boundary map',
    chip: 'Boundary verified against Ardhisasa',
    isMap: true,
  },
  {
    key: 'access',
    label: 'Access & market',
    tabIcon: '⚑',
    title: 'Know what\u2019s around it before you commit',
    copy: 'Distance to the nearest market town, road quality, and demand signal from other farmers searching the same county.',
    image: '/assets/image_1786763068693.png',
    alt: 'Local access and market context',
    chip: '4.2 km to Nakuru Town',
  },
];

export default function LandoraTour() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="tour-section">
      <div className="section-inner">
        <div className="tour-heading">
          <div className="section-eyebrow">Take the short tour</div>
          <h2 className="section-h2">Everything a real listing shows you</h2>
          <p className="section-sub">
            No two ways to see the same parcel look alike — Landora stitches them into one walk-through
            so a remote search still feels like standing on the land.
          </p>
        </div>

        <div className="tour-device">
          <div className="tour-tabbar">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                type="button"
                className={`tour-tab ${active === i ? 'active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span className="tour-tab-icon" aria-hidden="true">{t.tabIcon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="tour-stage">
            <div className="tour-stage-media">
              <img src={tab.image} alt={tab.alt} />
              <div className="tour-stage-chip">{tab.chip}</div>

              {tab.isVideo && (
                <div className="tour-play-btn" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5z" fill="#0D2B14" /></svg>
                </div>
              )}

              {tab.isMap && (
                <svg className="tour-map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polygon points="18,70 30,22 78,30 66,82" fill="rgba(224,160,48,0.18)" stroke="var(--o400)" strokeWidth="1.4" strokeDasharray="3 2" />
                  <circle cx="30" cy="22" r="1.6" fill="var(--o400)" />
                  <circle cx="78" cy="30" r="1.6" fill="var(--o400)" />
                  <circle cx="66" cy="82" r="1.6" fill="var(--o400)" />
                  <circle cx="18" cy="70" r="1.6" fill="var(--o400)" />
                </svg>
              )}
            </div>

            <div className="tour-stage-info">
              <div className="tour-stage-eyebrow">{String(active + 1).padStart(2, '0')} / {String(TABS.length).padStart(2, '0')} · {tab.label}</div>
              <h3>{tab.title}</h3>
              <p>{tab.copy}</p>
              <div className="tour-stage-dots">
                {TABS.map((t, i) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-label={`Show ${t.label}`}
                    className={`tour-dot ${active === i ? 'active' : ''}`}
                    onClick={() => setActive(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
