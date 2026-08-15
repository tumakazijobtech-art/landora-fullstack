import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SCORE_OPTIONS } from '../constants.js';

function pointsToText(points) {
  return (points || []).map((p) => `${p.lat}, ${p.lng}`).join('\n');
}
function textToPoints(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [lat, lng] = line.split(',').map((v) => parseFloat(v.trim()));
      return { lat, lng };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

const EMPTY_RAINFALL = ['2022', '2023', '2024', '2025', '2026'].map((season) => ({ season, insurable: true }));

export default function AdminParcelEditor() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  const [base, setBase] = useState(null);
  const [score, setScore] = useState('');
  const [keyFacts, setKeyFacts] = useState({});
  const [titleVerification, setTitleVerification] = useState({ method: 'ardhisasa', status: 'unverified', encumbrances: 'None' });
  const [report, setReport] = useState({ metrics: {}, rainfallHistory: EMPTY_RAINFALL });
  const [boundaryText, setBoundaryText] = useState('');
  const [streamText, setStreamText] = useState('');
  const [roadText, setRoadText] = useState('');
  const [centroidLat, setCentroidLat] = useState('');
  const [centroidLng, setCentroidLng] = useState('');
  const [video, setVideo] = useState({});

  useEffect(() => {
    api.adminGetParcel(id, token)
      .then((data) => {
        const p = data.parcel;
        setBase(p);
        setScore(p.score || '');
        setKeyFacts(p.keyFacts || {});
        setTitleVerification({ method: 'ardhisasa', status: 'unverified', encumbrances: 'None', ...(p.titleVerification || {}) });
        setReport({
          metrics: {},
          rainfallHistory: EMPTY_RAINFALL,
          ...(p.productivityReport || {}),
        });
        setBoundaryText(pointsToText(p.mapData?.boundaryPoints));
        setStreamText(pointsToText(p.mapData?.streamPoints));
        setRoadText(pointsToText(p.mapData?.roadPoints));
        setCentroidLat(p.mapData?.centroidLat ?? '');
        setCentroidLng(p.mapData?.centroidLng ?? '');
        setVideo(p.videoWalkthrough || {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateBase(field, value) {
    setBase((b) => ({ ...b, [field]: value }));
  }
  function updateKeyFacts(field, value) {
    setKeyFacts((k) => ({ ...k, [field]: value }));
  }
  function updateTitleVerification(field, value) {
    setTitleVerification((t) => ({ ...t, [field]: value }));
  }
  function updateReport(field, value) {
    setReport((r) => ({ ...r, [field]: value }));
  }
  function updateMetric(field, value) {
    setReport((r) => ({ ...r, metrics: { ...r.metrics, [field]: value === '' ? undefined : Number(value) } }));
  }
  function updateRainfall(index, insurable) {
    setReport((r) => ({
      ...r,
      rainfallHistory: r.rainfallHistory.map((s, i) => (i === index ? { ...s, insurable } : s)),
    }));
  }
  function updateVideo(field, value) {
    setVideo((v) => ({ ...v, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaved('');
    setSaving(true);
    try {
      await api.adminUpdateParcel(id, {
        title: base.title,
        reference: base.reference,
        county: base.county,
        location: base.location,
        sizeAcres: parseFloat(base.sizeAcres),
        totalAcres: base.totalAcres ? parseFloat(base.totalAcres) : undefined,
        pricePerAcrePerSeason: parseFloat(base.pricePerAcrePerSeason),
        crop: base.crop,
        season: base.season,
        description: base.description,
        status: base.status,
        score,
      }, token);

      await api.adminEnrichParcel(id, {
        score,
        keyFacts: {
          acreageTotal: keyFacts.acreageTotal ? Number(keyFacts.acreageTotal) : undefined,
          suggestedCrop: keyFacts.suggestedCrop,
          waterAccessDetail: keyFacts.waterAccessDetail,
          tenure: keyFacts.tenure,
          financingDetail: keyFacts.financingDetail,
          insuranceDetail: keyFacts.insuranceDetail,
        },
        titleVerification: {
          status: titleVerification.status,
          method: titleVerification.method,
          titleNumber: titleVerification.titleNumber,
          landownerNameOnTitle: titleVerification.landownerNameOnTitle,
          encumbrances: titleVerification.encumbrances,
          disbursementRecordLabel: titleVerification.disbursementRecordLabel,
          notes: titleVerification.notes,
        },
        productivityReport: {
          scoreLabel: score,
          rateRangeMin: report.rateRangeMin ? Number(report.rateRangeMin) : undefined,
          rateRangeMax: report.rateRangeMax ? Number(report.rateRangeMax) : undefined,
          metrics: report.metrics,
          soilClassification: report.soilClassification,
          soilNote: report.soilNote,
          avgSeasonalRainfall: report.avgSeasonalRainfall,
          rainfallNote: report.rainfallNote,
          vegetationHealth: report.vegetationHealth,
          vegetationNote: report.vegetationNote,
          elevationTerrain: report.elevationTerrain,
          terrainNote: report.terrainNote,
          marketAccessSummary: report.marketAccessSummary,
          marketAccessNote: report.marketAccessNote,
          demandSignal: report.demandSignal,
          demandNote: report.demandNote,
          comparableParcels: report.comparableParcels,
          comparableNote: report.comparableNote,
          previousCropRotation: report.previousCropRotation,
          cropRotationNote: report.cropRotationNote,
          waterAccessSummary: report.waterAccessSummary,
          waterAccessNote: report.waterAccessNote,
          rainfallHistory: report.rainfallHistory,
          agronomicNotes: report.agronomicNotes,
        },
        mapData: {
          centroidLat: centroidLat !== '' ? Number(centroidLat) : undefined,
          centroidLng: centroidLng !== '' ? Number(centroidLng) : undefined,
          boundaryPoints: textToPoints(boundaryText),
          streamPoints: textToPoints(streamText),
          roadPoints: textToPoints(roadText),
        },
        videoWalkthrough: {
          url: video.url,
          caption: video.caption,
          durationLabel: video.durationLabel,
        },
      }, token);

      setSaved('Saved. This listing now reflects everywhere it appears on the site.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await api.adminDeleteParcel(id, token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="section"><div className="section-inner">Loading…</div></div>;
  if (!base) return <div className="section"><div className="section-inner"><div className="error-box">{error || 'Not found'}</div></div></div>;

  return (
    <div className="section">
      <div className="section-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">Admin · edit listing</div>
            <h2 className="section-h2" style={{ marginBottom: 4 }}>{base.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link className="btn-outline-green" to={`/parcels/${id}`}>View live listing</Link>
            <Link className="btn-outline-green" to="/admin">Back to all listings</Link>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
        {saved && <div className="info-box">{saved}</div>}

        <form onSubmit={handleSave}>
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Listing details</div>
            <div className="field-group">
              <div className="field-row">
                <div className="field"><label>Title</label><input value={base.title} onChange={(e) => updateBase('title', e.target.value)} /></div>
                <div className="field"><label>Reference</label><input value={base.reference || ''} onChange={(e) => updateBase('reference', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>County</label><input value={base.county} onChange={(e) => updateBase('county', e.target.value)} /></div>
                <div className="field"><label>Location</label><input value={base.location} onChange={(e) => updateBase('location', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Size (acres available)</label><input type="number" value={base.sizeAcres} onChange={(e) => updateBase('sizeAcres', e.target.value)} /></div>
                <div className="field"><label>Total acres on parcel</label><input type="number" value={base.totalAcres || ''} onChange={(e) => updateBase('totalAcres', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Price (KES / ac / season)</label><input type="number" value={base.pricePerAcrePerSeason} onChange={(e) => updateBase('pricePerAcrePerSeason', e.target.value)} /></div>
                <div className="field"><label>Land use</label><input value={base.crop} onChange={(e) => updateBase('crop', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select value={base.status} onChange={(e) => updateBase('status', e.target.value)}>
                    <option value="available">Available</option>
                    <option value="under_review">Under review</option>
                    <option value="leased">Leased</option>
                    <option value="unlisted">Unlisted</option>
                  </select>
                </div>
                <div className="field">
                  <label>Plot rating (score)</label>
                  <select value={score} onChange={(e) => setScore(e.target.value)}>
                    <option value="">Not rated yet</option>
                    {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Description</label><textarea rows={3} value={base.description || ''} onChange={(e) => updateBase('description', e.target.value)} /></div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Key facts</div>
            <div className="card-sub">Descriptive facts sourced by the GIS engine and reviewed by the field team.</div>
            <div className="field-group">
              <div className="field-row">
                <div className="field"><label>Total acreage on parcel</label><input type="number" value={keyFacts.acreageTotal || ''} onChange={(e) => updateKeyFacts('acreageTotal', e.target.value)} /></div>
                <div className="field"><label>Suggested crop</label><input value={keyFacts.suggestedCrop || ''} onChange={(e) => updateKeyFacts('suggestedCrop', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Water access detail</label><input value={keyFacts.waterAccessDetail || ''} onChange={(e) => updateKeyFacts('waterAccessDetail', e.target.value)} placeholder="e.g. Seasonal stream, eastern boundary" /></div>
                <div className="field"><label>Tenure</label><input value={keyFacts.tenure || ''} onChange={(e) => updateKeyFacts('tenure', e.target.value)} placeholder="e.g. Freehold, no encumbrances" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Financing detail</label><input value={keyFacts.financingDetail || ''} onChange={(e) => updateKeyFacts('financingDetail', e.target.value)} /></div>
                <div className="field"><label>Insurance detail</label><input value={keyFacts.insuranceDetail || ''} onChange={(e) => updateKeyFacts('insuranceDetail', e.target.value)} /></div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Title & identity verification</div>
            <div className="card-sub">
              Every parcel should be checked against the Ministry of Lands' Ardhisasa portal. If a title
              isn't yet reachable there, fall back to a manual search (county registry or a physical
              search at the lands office) and record what was found.
            </div>
            <div className="field-group">
              <div className="field-row">
                <div className="field">
                  <label>Verification method</label>
                  <select value={titleVerification.method} onChange={(e) => updateTitleVerification('method', e.target.value)}>
                    <option value="ardhisasa">Checked on Ardhisasa</option>
                    <option value="manual">Manual search</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={titleVerification.status} onChange={(e) => updateTitleVerification('status', e.target.value)}>
                    <option value="unverified">Not yet checked</option>
                    <option value="pending">Check in progress</option>
                    <option value="verified">Verified</option>
                    <option value="flagged">Flagged — needs follow-up</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field"><label>Title / parcel number</label><input value={titleVerification.titleNumber || ''} onChange={(e) => updateTitleVerification('titleNumber', e.target.value)} placeholder="As shown on Ardhisasa or the registry" /></div>
                <div className="field"><label>Landowner name on title</label><input value={titleVerification.landownerNameOnTitle || ''} onChange={(e) => updateTitleVerification('landownerNameOnTitle', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Encumbrances</label><input value={titleVerification.encumbrances || ''} onChange={(e) => updateTitleVerification('encumbrances', e.target.value)} placeholder="e.g. None, or details of any charge/caveat" /></div>
                <div className="field"><label>Disbursement record label</label><input value={titleVerification.disbursementRecordLabel || ''} onChange={(e) => updateTitleVerification('disbursementRecordLabel', e.target.value)} placeholder="e.g. 100% on time disbursement record" /></div>
              </div>
              <div className="field"><label>Notes (e.g. what a manual search turned up)</label><textarea rows={3} value={titleVerification.notes || ''} onChange={(e) => updateTitleVerification('notes', e.target.value)} /></div>
            </div>

          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Land productivity report</div>
            <div className="card-sub">Rate range and metric bars shown at the top of the report.</div>
            <div className="field-group">
              <div className="field-row">
                <div className="field"><label>Fair rate range — min (KES/ac/season)</label><input type="number" value={report.rateRangeMin || ''} onChange={(e) => updateReport('rateRangeMin', e.target.value)} /></div>
                <div className="field"><label>Fair rate range — max</label><input type="number" value={report.rateRangeMax || ''} onChange={(e) => updateReport('rateRangeMax', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Soil quality (%)</label><input type="number" min="0" max="100" value={report.metrics?.soilQuality ?? ''} onChange={(e) => updateMetric('soilQuality', e.target.value)} /></div>
                <div className="field"><label>Rainfall reliability (%)</label><input type="number" min="0" max="100" value={report.metrics?.rainfallReliability ?? ''} onChange={(e) => updateMetric('rainfallReliability', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Market access (%)</label><input type="number" min="0" max="100" value={report.metrics?.marketAccess ?? ''} onChange={(e) => updateMetric('marketAccess', e.target.value)} /></div>
                <div className="field"><label>Historical yield (%)</label><input type="number" min="0" max="100" value={report.metrics?.historicalYield ?? ''} onChange={(e) => updateMetric('historicalYield', e.target.value)} /></div>
              </div>

              <div className="field-row">
                <div className="field"><label>Soil classification</label><input value={report.soilClassification || ''} onChange={(e) => updateReport('soilClassification', e.target.value)} placeholder="e.g. Humic Nitisol" /></div>
                <div className="field"><label>Soil note</label><input value={report.soilNote || ''} onChange={(e) => updateReport('soilNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Average seasonal rainfall</label><input value={report.avgSeasonalRainfall || ''} onChange={(e) => updateReport('avgSeasonalRainfall', e.target.value)} placeholder="e.g. 562mm long rains" /></div>
                <div className="field"><label>Rainfall note</label><input value={report.rainfallNote || ''} onChange={(e) => updateReport('rainfallNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Vegetation health, NDVI</label><input value={report.vegetationHealth || ''} onChange={(e) => updateReport('vegetationHealth', e.target.value)} placeholder="e.g. 0.71 peak index" /></div>
                <div className="field"><label>Vegetation note</label><input value={report.vegetationNote || ''} onChange={(e) => updateReport('vegetationNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Elevation and terrain</label><input value={report.elevationTerrain || ''} onChange={(e) => updateReport('elevationTerrain', e.target.value)} placeholder="e.g. 1,890 metres, gentle slope" /></div>
                <div className="field"><label>Terrain note</label><input value={report.terrainNote || ''} onChange={(e) => updateReport('terrainNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Market access summary</label><input value={report.marketAccessSummary || ''} onChange={(e) => updateReport('marketAccessSummary', e.target.value)} placeholder="e.g. 4.2 km to Nakuru Town" /></div>
                <div className="field"><label>Market access note</label><input value={report.marketAccessNote || ''} onChange={(e) => updateReport('marketAccessNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Demand signal</label><input value={report.demandSignal || ''} onChange={(e) => updateReport('demandSignal', e.target.value)} placeholder="e.g. High, 47 farmers searching" /></div>
                <div className="field"><label>Demand note</label><input value={report.demandNote || ''} onChange={(e) => updateReport('demandNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Comparable parcels nearby</label><input value={report.comparableParcels || ''} onChange={(e) => updateReport('comparableParcels', e.target.value)} placeholder="e.g. KES 17,400 to 22,800" /></div>
                <div className="field"><label>Comparable note</label><input value={report.comparableNote || ''} onChange={(e) => updateReport('comparableNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Previous crop rotation</label><input value={report.previousCropRotation || ''} onChange={(e) => updateReport('previousCropRotation', e.target.value)} placeholder="e.g. Maize, then beans" /></div>
                <div className="field"><label>Crop rotation note</label><input value={report.cropRotationNote || ''} onChange={(e) => updateReport('cropRotationNote', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Water access summary</label><input value={report.waterAccessSummary || ''} onChange={(e) => updateReport('waterAccessSummary', e.target.value)} placeholder="e.g. Seasonal stream" /></div>
                <div className="field"><label>Water access note</label><input value={report.waterAccessNote || ''} onChange={(e) => updateReport('waterAccessNote', e.target.value)} /></div>
              </div>

              <div className="field">
                <label>Five-season rainfall history — mark each season within the insurable band</label>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {report.rainfallHistory.map((s, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={s.insurable} onChange={(e) => updateRainfall(i, e.target.checked)} />
                      {s.season}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field"><label>Agronomic notes</label><textarea rows={4} value={report.agronomicNotes || ''} onChange={(e) => updateReport('agronomicNotes', e.target.value)} /></div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Parcel map (GIS boundary data)</div>
            <div className="card-sub">One "lat, lng" pair per line. The boundary needs at least 3 points to render.</div>
            <div className="field-group">
              <div className="field-row">
                <div className="field"><label>Centroid latitude</label><input type="number" step="0.0001" value={centroidLat} onChange={(e) => setCentroidLat(e.target.value)} /></div>
                <div className="field"><label>Centroid longitude</label><input type="number" step="0.0001" value={centroidLng} onChange={(e) => setCentroidLng(e.target.value)} /></div>
              </div>
              <div className="field"><label>Boundary points</label><textarea rows={4} value={boundaryText} onChange={(e) => setBoundaryText(e.target.value)} placeholder={'0.0640, 36.1258\n0.0645, 36.1270\n...'} /></div>
              <div className="field"><label>Stream points (optional)</label><textarea rows={3} value={streamText} onChange={(e) => setStreamText(e.target.value)} /></div>
              <div className="field"><label>Access road points (optional)</label><textarea rows={3} value={roadText} onChange={(e) => setRoadText(e.target.value)} /></div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>Video walkthrough</div>
            <div className="field-group">
              <div className="field"><label>Video URL</label><input value={video.url || ''} onChange={(e) => updateVideo('url', e.target.value)} placeholder="https://…" /></div>
              <div className="field-row">
                <div className="field"><label>Caption</label><input value={video.caption || ''} onChange={(e) => updateVideo('caption', e.target.value)} placeholder="Walk the boundary with the landowner" /></div>
                <div className="field"><label>Duration label</label><input value={video.durationLabel || ''} onChange={(e) => updateVideo('durationLabel', e.target.value)} placeholder="e.g. 3:42" /></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-green" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button className="btn-outline-green" type="button" onClick={handleDelete} style={{ borderColor: '#F3C6BC', color: '#A3392A' }}>Delete listing</button>
          </div>
        </form>
      </div>
    </div>
  );
}
