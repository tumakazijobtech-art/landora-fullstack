import React, { useRef, useState } from 'react';

// Floating AI Agent launcher for the marketplace page. Posts each message to your
// self hosted n8n workflow (set VITE_N8N_WEBHOOK_URL) and shows whatever text field
// the workflow returns. With no webhook configured, the panel still opens and
// explains what to set, so the feature never looks broken in a fresh deployment.
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

function extractReply(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return extractReply(data[0]);
  return data.output || data.reply || data.text || data.message || JSON.stringify(data);
}

export default function AIAgentWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'agent', text: "Hi, I'm the Landora land assistant. Ask me about a county, a crop, or how leasing works here." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sessionId = useRef(`web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');

    if (!WEBHOOK_URL) {
      setMessages((m) => [
        ...m,
        {
          role: 'agent',
          text: 'This assistant is not wired up yet. Set VITE_N8N_WEBHOOK_URL to your n8n workflow webhook to bring it online.',
        },
      ]);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current, source: 'landora-marketplace' }),
      });
      const data = await res.json().catch(() => null);
      const reply = extractReply(data) || "Sorry, I didn't get a usable reply from the workflow.";
      setMessages((m) => [...m, { role: 'agent', text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: 'Could not reach the assistant right now. Try again shortly.' }]);
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
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Landora AI Agent</div>
              <div style={{ fontSize: 11.5, color: 'var(--g100)' }}>Powered by your n8n workflow</div>
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
              placeholder="Ask about land, crops, or a county…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="button" className="btn-green" onClick={send} disabled={sending}>Send</button>
          </div>
        </div>
      )}
      <button type="button" className="ai-agent-launcher" onClick={() => setOpen((o) => !o)} aria-label="Open the Landora AI agent">
        {open ? '×' : '✨'}
      </button>
    </div>
  );
}
