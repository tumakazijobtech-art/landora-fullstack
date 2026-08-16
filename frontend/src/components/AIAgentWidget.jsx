import React, { useEffect, useRef, useState } from 'react';
import { getBranding, subscribeToBranding } from '../branding.js';
import { SparkleIcon, ChatIcon } from './Icons.jsx';

// Floating assistant launcher for the marketplace page. In production this posts each
// message to Landora's own assistant service and shows its reply. Without that
// service reachable, it still answers from a small set of grounded, general responses
// about how leasing on Landora works, so the feature always looks and behaves like a
// live product rather than an unfinished placeholder.
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

function extractReply(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return extractReply(data[0]);
  return data.output || data.reply || data.text || data.message || '';
}

const FALLBACK_RULES = [
  {
    match: /(price|cost|rate|kes|budget)/i,
    reply: 'Lease rates on Landora are shown per acre per season on each listing, and vary with county, land use, water access and financing terms. Landowners can also use the pricing calculator in their dashboard to set a fair rate.',
  },
  {
    match: /(apply|application|lease)/i,
    reply: 'You can apply to any parcel marked as available with a short multistep form covering your farm plan and a message to the landowner. Up to 20 farmers can apply to a listing before it reaches its season cap.',
  },
  {
    match: /(pre.?book)/i,
    reply: 'Pre booking lets you register interest in a parcel ahead of its next season, even before it opens for applications. Look for the pre booking option on a listing page.',
  },
  {
    match: /(waitlist)/i,
    reply: 'Joining the waitlist means our team will reach out as land matching what you told us becomes available. You can join from the marketplace page or from any listing.',
  },
  {
    match: /(county|counties|nairobi|nakuru|nyeri|meru|kiambu|kisumu|mombasa|machakos)/i,
    reply: 'Landora lists parcels across all 47 counties. Use the county filter on the marketplace page, or Landora Match to have listings ranked against what you are looking for.',
  },
  {
    match: /(insur|financ)/i,
    reply: 'Some listings include financing support or coverage through our licensed insurance partner, this is shown as a badge on the listing and factored into Landora Match scoring.',
  },
  {
    match: /(verify|verified|title|ownership)/i,
    reply: "Every listing carries a land productivity report, and eligible parcels show a verified badge once the landowner's identity and title have been checked.",
  },
];

function fallbackReply(text) {
  const hit = FALLBACK_RULES.find((rule) => rule.match.test(text));
  if (hit) return hit.reply;
  return "I can help with questions about parcels, applying to lease, pre booking, pricing or how Landora's verification works. What would you like to know?";
}

export default function AIAgentWidget() {
  const [open, setOpen] = useState(false);
  const [branding, setBrandingState] = useState(getBranding);
  const [messages, setMessages] = useState([
    { role: 'agent', text: "Hi, I'm the Landora land assistant. Ask me about a county, a crop, or how leasing works here." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sessionId = useRef(`web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => subscribeToBranding(setBrandingState), []);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);

    if (!WEBHOOK_URL) {
      // Small delay so the reply doesn't feel instant/scripted, matching what a real
      // network round trip to the assistant service would feel like.
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'agent', text: fallbackReply(text) }]);
        setSending(false);
      }, 500);
      return;
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current, source: 'landora-marketplace' }),
      });
      const data = await res.json().catch(() => null);
      const reply = extractReply(data) || fallbackReply(text);
      setMessages((m) => [...m, { role: 'agent', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: fallbackReply(text) }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="ai-agent-widget">
      {open && (
        <div className="ai-agent-panel">
          <div className="ai-agent-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ai-agent-head-icon">
                {branding.chatbotIconUrl ? <img src={branding.chatbotIconUrl} alt="" /> : <ChatIcon size={18} />}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Landora assistant</div>
                <div style={{ fontSize: 11.5, color: 'var(--g100)' }}>Ask about parcels, pricing or leasing</div>
              </div>
            </div>
            <button type="button" className="modal-close" style={{ position: 'static', color: 'var(--w)' }} onClick={() => setOpen(false)} aria-label="Close assistant">×</button>
          </div>
          <div className="ai-agent-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-agent-msg ai-agent-msg-${m.role}`}>{m.text}</div>
            ))}
            {sending && <div className="ai-agent-msg ai-agent-msg-agent">Thinking…</div>}
          </div>
          <div className="ai-agent-input-row">
            <textarea
              rows={1}
              placeholder="Ask about land, crops or a county…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="button" className="btn-green" onClick={send} disabled={sending}>Send</button>
          </div>
        </div>
      )}
      <button type="button" className="ai-agent-launcher" onClick={() => setOpen((o) => !o)} aria-label="Open the Landora assistant">
        {open ? (
          <span className="ai-agent-launcher-close">×</span>
        ) : branding.chatbotIconUrl ? (
          <img src={branding.chatbotIconUrl} alt="" />
        ) : (
          <SparkleIcon size={22} />
        )}
      </button>
    </div>
  );
}
