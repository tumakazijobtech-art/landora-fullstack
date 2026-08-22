import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckIcon } from './Icons.jsx';

const STEPS_LEASE = ['Your details', 'Farm plan', 'Review and send'];
const STEPS_PREBOOKING = ['Your details', 'Season plan', 'Review and send'];

const emptyForm = (user) => ({
  applicantName: user?.name || '',
  applicantPhone: user?.phone || '',
  intendedCrop: '',
  seasonsRequested: 1,
  preferredSeason: '',
  message: '',
});

// A multistep application, used both for a normal lease application on an available
// parcel and for reserving a parcel ahead of a season (type="prebooking"). Splitting
// it into steps keeps each screen short, and nothing is sent to the server until the
// final review step is confirmed.
export default function ApplyLeaseWizard({ parcel, user, type = 'lease', onSuccess, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyForm(user));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const steps = type === 'prebooking' ? STEPS_PREBOOKING : STEPS_LEASE;
  const isLastStep = step === steps.length - 1;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.applicantName.trim()) return 'Add your name so the landowner knows who is applying.';
      if (!form.applicantPhone.trim()) return 'Add a phone number so we can reach you.';
    }
    if (step === 1 && type === 'prebooking' && !form.preferredSeason.trim()) {
      return 'Let us know which season you want to book for.';
    }
    return '';
  }

  function next() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(token) {
    setError('');
    setSubmitting(true);
    try {
      const { application } = await api.applyToParcel(
        {
          parcelId: parcel._id,
          type,
          applicantName: form.applicantName,
          applicantPhone: form.applicantPhone,
          intendedCrop: form.intendedCrop,
          seasonsRequested: form.seasonsRequested,
          preferredSeason: form.preferredSeason,
          message: form.message,
        },
        token
      );
      onSuccess(application, type);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WizardBody
      steps={steps}
      step={step}
      form={form}
      update={update}
      error={error}
      submitting={submitting}
      type={type}
      next={next}
      back={back}
      onCancel={onCancel}
      isLastStep={isLastStep}
      onSubmitFinal={handleSubmit}
    />
  );
}

// WizardBody is separate so useAuth() (a hook) is called unconditionally at the top
// of a component, same as everywhere else in the app.
function WizardBody({ steps, step, form, update, error, submitting, type, next, back, onCancel, isLastStep, onSubmitFinal }) {
  const { token } = useAuth();

  return (
    <div className="apply-wizard">
      <div className="apply-wizard-steps">
        {steps.map((label, i) => (
          <div key={label} className={`apply-wizard-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="apply-wizard-step-dot">{i < step ? <CheckIcon size={11} /> : i + 1}</span>
            <span className="apply-wizard-step-label">{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-box">
          {error}
          {/(phone number|national ID)/i.test(error) && (
            <> <Link to="/profile">Verify from your profile →</Link></>
          )}
        </div>
      )}

      {step === 0 && (
        <div className="field-group">
          <div className="field">
            <label>Full name</label>
            <input value={form.applicantName} onChange={(e) => update('applicantName', e.target.value)} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input value={form.applicantPhone} onChange={(e) => update('applicantPhone', e.target.value)} placeholder="07..." />
          </div>
          <div className="field">
            <label>Intended crop</label>
            <input value={form.intendedCrop} onChange={(e) => update('intendedCrop', e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="field-group">
          {type === 'prebooking' ? (
            <div className="field">
              <label>Season you want to book</label>
              <input value={form.preferredSeason} onChange={(e) => update('preferredSeason', e.target.value)} placeholder="e.g. Short rains 2026" />
            </div>
          ) : (
            <div className="field">
              <label>Seasons requested</label>
              <input
                type="number" min={1} max={20}
                value={form.seasonsRequested}
                onChange={(e) => update('seasonsRequested', parseInt(e.target.value, 10) || 1)}
              />
            </div>
          )}
          <div className="field">
            <label>Message to the landowner</label>
            <textarea rows={4} value={form.message} onChange={(e) => update('message', e.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="apply-wizard-review">
          <div className="kv-row"><span>Name</span><strong>{form.applicantName || 'N/A'}</strong></div>
          <div className="kv-row"><span>Phone</span><strong>{form.applicantPhone || 'N/A'}</strong></div>
          <div className="kv-row"><span>Intended crop</span><strong>{form.intendedCrop || 'N/A'}</strong></div>
          {type === 'prebooking' ? (
            <div className="kv-row"><span>Season</span><strong>{form.preferredSeason || 'N/A'}</strong></div>
          ) : (
            <div className="kv-row"><span>Seasons requested</span><strong>{form.seasonsRequested}</strong></div>
          )}
          {form.message && <div className="kv-row"><span>Message</span><strong>{form.message}</strong></div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {step > 0 && <button className="btn-outline-green" type="button" onClick={back}>Back</button>}
        {!isLastStep && <button className="btn-green" type="button" onClick={next}>Continue</button>}
        {isLastStep && (
          <button className="btn-green" type="button" disabled={submitting} onClick={() => onSubmitFinal(token)}>
            {submitting ? 'Sending…' : type === 'prebooking' ? 'Confirm pre booking' : 'Send application'}
          </button>
        )}
        <button className="btn-outline-green" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
