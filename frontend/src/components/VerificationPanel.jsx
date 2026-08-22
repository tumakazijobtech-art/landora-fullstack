import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldIcon } from './Icons.jsx';

const ID_STATUS_LABEL = {
  unverified: 'Not submitted',
  pending: 'Under review',
  verified: 'Verified',
  flagged: 'Needs attention',
};

// Buyers (farmers) and sellers (landowners) both need a verified phone number and a
// verified national ID before they can apply to lease or publish a listing (see
// requirePhoneVerified / requireIdVerified on the backend). This panel lets either
// role complete both checks from their own profile page.
export default function VerificationPanel() {
  const { user, token, updateUser } = useAuth();

  const [otpStage, setOtpStage] = useState('idle'); // idle | sent | confirming
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  const [idNumber, setIdNumber] = useState(user?.nationalId || '');
  const [idBusy, setIdBusy] = useState(false);
  const [idError, setIdError] = useState('');
  const [idNotice, setIdNotice] = useState('');

  async function requestOtp() {
    setOtpError('');
    setOtpNotice('');
    setOtpBusy(true);
    try {
      const data = await api.requestPhoneOtp(token);
      setOtpStage('sent');
      setOtpNotice(`Code sent to ${data.verification.phone}. It expires in ${Math.round(data.verification.expiresInSeconds / 60)} minutes.`);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpBusy(false);
    }
  }

  async function confirmOtp(e) {
    e.preventDefault();
    setOtpError('');
    setOtpBusy(true);
    try {
      const data = await api.confirmPhoneOtp(otpCode, token);
      updateUser(data.user);
      setOtpStage('idle');
      setOtpCode('');
      setOtpNotice('Phone number verified.');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpBusy(false);
    }
  }

  async function submitId(e) {
    e.preventDefault();
    setIdError('');
    setIdNotice('');
    setIdBusy(true);
    try {
      const data = await api.submitIdVerification(idNumber, token);
      updateUser(data.user);
      setIdNotice(
        data.user.idVerification?.status === 'verified'
          ? 'Your ID was verified automatically.'
          : 'Submitted — our team will review it shortly.'
      );
    } catch (err) {
      setIdError(err.message);
    } finally {
      setIdBusy(false);
    }
  }

  const idStatus = user.idVerification?.status || 'unverified';

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShieldIcon size={16} />
        <div className="card-title" style={{ marginBottom: 0, fontSize: 15 }}>Verification</div>
      </div>
      <div className="card-sub" style={{ marginBottom: 18 }}>
        Required before you can {user.role === 'landowner' ? 'publish a listing' : 'apply to lease a parcel'}.
      </div>

      {/* Phone OTP */}
      <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--s100)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Phone number</div>
            <div style={{ fontSize: 12, color: 'var(--s500)' }}>{user.phone}</div>
          </div>
          <span className={`status-pill status-${user.phoneVerified ? 'accepted' : 'pending'}`}>
            {user.phoneVerified ? 'Verified' : 'Not verified'}
          </span>
        </div>

        {!user.phoneVerified && (
          <div style={{ marginTop: 12 }}>
            {otpError && <div className="error-box">{otpError}</div>}
            {otpNotice && <div className="info-box" style={{ marginBottom: 10 }}>{otpNotice}</div>}
            {otpStage === 'idle' ? (
              <button type="button" className="btn-outline-green" onClick={requestOtp} disabled={otpBusy}>
                {otpBusy ? 'Sending…' : 'Send verification code'}
              </button>
            ) : (
              <form onSubmit={confirmOtp} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>6-digit code</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{ width: 120 }}
                  />
                </div>
                <button type="submit" className="btn-green" disabled={otpBusy}>
                  {otpBusy ? 'Checking…' : 'Confirm'}
                </button>
                <button type="button" className="text-button" onClick={requestOtp} disabled={otpBusy}>Resend</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* National ID */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>National ID</div>
          <span className={`status-pill status-${idStatus === 'verified' ? 'accepted' : idStatus === 'flagged' ? 'declined' : 'pending'}`}>
            {ID_STATUS_LABEL[idStatus]}
          </span>
        </div>
        {idStatus === 'flagged' && user.idVerification?.notes && (
          <div className="error-box" style={{ marginTop: 10 }}>{user.idVerification.notes}</div>
        )}

        {idStatus !== 'verified' && (
          <form onSubmit={submitId} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {idError && <div className="error-box" style={{ width: '100%' }}>{idError}</div>}
            {idNotice && <div className="info-box" style={{ width: '100%', marginBottom: 0 }}>{idNotice}</div>}
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
              <label>National ID number</label>
              <input required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 12345678" />
            </div>
            <button type="submit" className="btn-green" disabled={idBusy}>
              {idBusy ? 'Submitting…' : idStatus === 'unverified' ? 'Submit for verification' : 'Resubmit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
