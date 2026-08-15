import React, { useEffect, useRef, useState } from 'react';

function WhatsAppIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .79.8-2.93-.19-.3A7.93 7.93 0 1 1 12 20zm4.4-5.95c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14 0-.3-.02-.46-.02-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.71 2.6 4.14 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>;
}
function XIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.6-6.9L4.1 22H1l8.2-9.3L1 2h7.3l5.1 6.4L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg>;
}
function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>;
}
function InstagramIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg>;
}
function SmsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
}
function LinkIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 15l6-6M11 6l1.3-1.3a4 4 0 0 1 5.6 5.7L16.5 12M13 18l-1.3 1.3a4 4 0 0 1-5.6-5.7L7.5 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

// Share a parcel to WhatsApp, SMS, X, Facebook, or Instagram, plus a plain copy link
// fallback. Instagram has no web intent that accepts a pre filled link, so that
// option copies the caption and opens Instagram for a manual paste, which is the
// standard workaround every site in this situation uses.
export default function ShareMenu({ title, text, url }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const caption = `${text} ${url}`;
  const encodedCaption = encodeURIComponent(caption);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const links = [
    { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon />, href: `https://wa.me/?text=${encodedCaption}` },
    { key: 'sms', label: 'Text message', icon: <SmsIcon />, href: `sms:?&body=${encodedCaption}` },
    { key: 'x', label: 'X', icon: <XIcon />, href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { key: 'facebook', label: 'Facebook', icon: <FacebookIcon />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
  ];

  async function copyCaption(message) {
    try {
      await navigator.clipboard.writeText(caption);
      setStatus(message);
    } catch {
      setStatus(url);
    }
    setTimeout(() => setStatus(''), 3000);
  }

  function handleInstagram(e) {
    e.preventDefault();
    copyCaption('Caption copied — paste it into Instagram');
    window.open('https://instagram.com', '_blank', 'noopener');
  }

  async function handleNativeOrOpen() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setOpen(false);
        return;
      } catch {
        // Cancelled — fall through to the menu.
      }
    }
    setOpen((o) => !o);
  }

  return (
    <div className="share-menu" ref={ref}>
      <button type="button" className="icon-btn" title="Share this listing" aria-label="Share this listing" onClick={handleNativeOrOpen}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M8.6 10.5L15.4 6.5M8.6 13.5L15.4 17.5" stroke="currentColor" strokeWidth="1.6"/></svg>
      </button>
      {status && <span className="share-toast">{status}</span>}
      {open && (
        <div className="share-menu-panel">
          {links.map((l) => (
            <a key={l.key} className="share-menu-item" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              {l.icon}<span>{l.label}</span>
            </a>
          ))}
          <a className="share-menu-item" href="https://instagram.com" onClick={handleInstagram}>
            <InstagramIcon /><span>Instagram</span>
          </a>
          <button type="button" className="share-menu-item" onClick={() => { copyCaption('Link copied to clipboard'); setOpen(false); }}>
            <LinkIcon /><span>Copy link</span>
          </button>
        </div>
      )}
    </div>
  );
}
