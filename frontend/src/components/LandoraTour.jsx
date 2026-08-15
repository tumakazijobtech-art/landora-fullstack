import React, { useState } from 'react';

const steps = [
  {
    label: '01 · Scout',
    title: 'Start with the ground, not the guesswork',
    copy: 'Explore a parcel through aerial context, access roads, and the landowner’s own photos before you arrange a visit.',
    image: '/assets/image_1786763049012.png',
    alt: 'Satellite view of a mapped land parcel',
  },
  {
    label: '02 · Inspect',
    title: 'Look closer at the land story',
    copy: 'Move from the boundary into the actual terrain with a Matterport-style walkthrough and field imagery.',
    image: '/assets/image_1786763035226.png',
    alt: 'Woodland parcel view',
  },
  {
    label: '03 · Decide',
    title: 'Lease with a clearer point of view',
    copy: 'Compare soil, rainfall, water access, title checks, and seasonal pricing in one decision-ready report.',
    image: '/assets/image_1786763028438.png',
    alt: 'Land productivity report interface',
  },
];

export default function LandoraTour() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <section className="tour-section">
      <div className="section-inner">
        <div className="tour-heading">
          <div className="section-eyebrow">Take the short tour</div>
          <h2 className="section-h2">Build confidence before you sign</h2>
          <p className="section-sub">Landora turns a remote land search into a guided look at the place, the proof, and the path to a fair lease.</p>
        </div>
        <div className="tour-panel">
          <div className="tour-steps">
            {steps.map((item, index) => (
              <button className={`tour-step ${active === index ? 'active' : ''}`} key={item.label} type="button" onClick={() => setActive(index)}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>
          <div className="tour-preview">
            <img src={step.image} alt={step.alt} />
            <div className="tour-preview-caption">
              <span>{step.label}</span>
              <p>{step.copy}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}