import React, { useState } from 'react';
import {
  AerialIllustration,
  GroundIllustration,
  VideoIllustration,
  MapIllustration,
  AccessIllustration,
} from './TourIllustrations.jsx';

// Five tabs mirror how a serious land listing gets explored in real life — wide shot,
// walk the ground, watch it move, check the paper boundary, then check what's around
// it. Every visual is drawn by this project's own components (see
// TourIllustrations.jsx) rather than a photo or map-tile screenshot, so nothing here
// is third-party imagery — everything shown is Landora's own report data as well as
// its own artwork.
const TABS = [
  {
    key: 'aerial',
    label: 'Aerial view',
    tabIcon: '◱',
    title: 'See the whole parcel from above first',
    copy: 'Satellite-style context and county boundaries before you ever leave the app — so a "4.5 acres in Subukia" isn\u2019t just a number.',
    Illustration: AerialIllustration,
    chip: 'GIS overview · updated this season',
  },
  {
    key: 'ground',
    label: 'Ground walk',
    tabIcon: '⛰',
    title: 'Walk the terrain, not just the outline',
    copy: 'A guided sense of access roads, tree cover, and slope, built from the same details field agents record on the ground.',
    Illustration: GroundIllustration,
    chip: 'Field-verified access and terrain notes',
  },
  {
    key: 'video',
    label: 'Video walkthrough',
    tabIcon: '▶',
    title: 'Watch the boundary get walked in real time',
    copy: 'Every enriched listing ships with a short walkthrough video recorded with the landowner — boundary markers, water points, and access included.',
    Illustration: VideoIllustration,
    chip: '3:42 · with landowner narration',
    isVideo: true,
  },
  {
    key: 'map',
    label: 'Boundary map',
    tabIcon: '⛶',
    title: 'A GIS boundary you can actually check',
    copy: 'Cadastral references cross-checked against county records and satellite imagery, with streams and access roads plotted alongside the plot edge.',
    Illustration: MapIllustration,
    chip: 'Boundary verified against Ardhisasa',
    isMap: true,
  },
  {
    key: 'access',
    label: 'Access & market',
    tabIcon: '⚑',
    title: 'Know what\u2019s around it before you commit',
    copy: 'Distance to the nearest market town, road quality, and demand signal from other farmers searching the same county.',
    Illustration: AccessIllustration,
    chip: '4.2 km to the nearest market town',
  },
];

export default function LandoraTour() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  const Illustration = tab.Illustration;

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
              <Illustration />
              <div className="tour-stage-chip">{tab.chip}</div>

              {tab.isVideo && (
                <div className="tour-play-btn" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5-11-6.5z" fill="#0D2B14" /></svg>
                </div>
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
