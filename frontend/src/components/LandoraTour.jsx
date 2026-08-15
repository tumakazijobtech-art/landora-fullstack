import React, { useState } from 'react';

// Five tabs mirror how a serious land listing gets explored in real life — wide shot,
// walk the ground, watch it move, check the paper boundary, then check what's around
// it. Each tab links to a real photograph rather than an abstract illustration, so
// what a visitor sees here reads the same way the actual listing photos will.
const TABS = [
  {
    key: 'aerial',
    label: 'Aerial view',
    title: 'See the whole parcel from above first',
    copy: 'Satellite-style context and county boundaries before you ever leave the app, so a "4.5 acres in Subukia" is not just a number.',
    image: 'https://images.pexels.com/photos/3030296/pexels-photo-3030296.jpeg?auto=compress&cs=tinysrgb&w=1400',
    chip: 'GIS overview · updated this season',
  },
  {
    key: 'ground',
    label: 'Ground walk',
    title: 'Walk the terrain, not just the outline',
    copy: 'A guided sense of access roads, tree cover and slope, built from the same details field agents record on the ground.',
    image: 'https://images.pexels.com/photos/12210597/pexels-photo-12210597.jpeg?auto=compress&cs=tinysrgb&w=1400',
    chip: 'Field-verified access and terrain notes',
  },
  {
    key: 'video',
    label: 'Video walkthrough',
    title: 'Watch the boundary get walked in real time',
    copy: 'Every enriched listing ships with a short walkthrough video recorded with the landowner, boundary markers, water points and access included.',
    image: 'https://images.pexels.com/photos/19058081/pexels-photo-19058081.jpeg?auto=compress&cs=tinysrgb&w=1400',
    chip: '3:42 · with landowner narration',
    isVideo: true,
  },
  {
    key: 'map',
    label: 'Boundary map',
    title: 'A GIS boundary you can actually check',
    copy: 'Cadastral references cross-checked against county records and satellite imagery, with streams and access roads plotted alongside the plot edge.',
    image: 'https://images.pexels.com/photos/30557705/pexels-photo-30557705.jpeg?auto=compress&cs=tinysrgb&w=1400',
    chip: 'Boundary verified against Ardhisasa',
  },
  {
    key: 'access',
    label: 'Access & market',
    title: 'Know what is around it before you commit',
    copy: 'Distance to the nearest market town, road quality and demand signal from other farmers searching the same county.',
    image: 'https://images.pexels.com/photos/34029177/pexels-photo-34029177.jpeg?auto=compress&cs=tinysrgb&w=1400',
    chip: '4.2 km to the nearest market town',
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
            No two ways to see the same parcel look alike, so Landora stitches them into one walk-through
            and a remote search still feels like standing on the land.
          </p>
        </div>

        {/* Clicking a tab is a real filter, not decoration — it swaps both the photo
            and the copy on the right to that exact section of the listing. */}
        <div className="tour-laptop">
          <div className="tour-device">
            <div className="tour-tabbar">
              {TABS.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tour-tab ${active === i ? 'active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="tour-stage">
              <div className="tour-stage-media">
                <img src={tab.image} alt={tab.title} loading="lazy" />
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
          <div className="tour-laptop-base" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
