import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { ChatIcon } from './Icons.jsx';

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function otherParty(conversation, user) {
  if (!conversation) return null;
  return user.role === 'farmer' ? conversation.landowner : conversation.farmer;
}

function ConversationRow({ conversation, onOpen, user }) {
  const other = otherParty(conversation, user);
  return (
    <button type="button" className="chat-convo-row" onClick={() => onOpen(conversation._id)}>
      <img
        className="chat-convo-avatar"
        src={other?.profilePicture || '/logo.svg'}
        alt={other?.name || 'Landora user'}
      />
      <div className="chat-convo-body">
        <div className="chat-convo-top">
          <span className="chat-convo-name">{other?.name || 'Landora user'}</span>
          <span className="chat-convo-time">{timeLabel(conversation.lastMessageAt)}</span>
        </div>
        <div className="chat-convo-bottom">
          <span className="chat-convo-parcel">{conversation.parcel?.title}</span>
          {conversation.unreadCount > 0 && <span className="chat-unread-dot">{conversation.unreadCount}</span>}
        </div>
        {conversation.lastMessageSnippet && (
          <div className="chat-convo-snippet">{conversation.lastMessageSnippet}</div>
        )}
      </div>
    </button>
  );
}

function ThreadView({ conversationId, onBack }) {
  const { token, user } = useAuth();
  const { socket } = useChat();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setConversation(null);
    api.getMessages(conversationId, token).then((data) => {
      if (!cancelled) setMessages(data.messages || []);
    }).catch((err) => setError(err.message));
    api.myConversations(token).then((data) => {
      const found = (data.conversations || []).find((c) => c._id === conversationId);
      if (!cancelled && found) setConversation(found);
    }).catch(() => {});
    api.markConversationRead(conversationId, token).catch(() => {});
    return () => { cancelled = true; };
  }, [conversationId, token]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('chat:join', conversationId);
    function handleMessage({ conversationId: incomingId, message }) {
      if (incomingId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
      api.markConversationRead(conversationId, token).catch(() => {});
    }
    socket.on('chat:message', handleMessage);
    return () => {
      socket.emit('chat:leave', conversationId);
      socket.off('chat:message', handleMessage);
    };
  }, [socket, conversationId, token]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    setDraft('');
    try {
      const data = await api.sendMessage(conversationId, body, token);
      // Realtime echo may also arrive via the socket — guard against a duplicate.
      setMessages((prev) => (prev.some((m) => m._id === data.message._id) ? prev : [...prev, data.message]));
    } catch (err) {
      setError(err.message);
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  const other = otherParty(conversation, user);

  return (
    <div className="chat-thread">
      <div className="chat-thread-header">
        <button type="button" className="chat-back-btn" onClick={onBack} aria-label="Back to conversations">‹</button>
        <div>
          <div className="chat-thread-name">{other?.name || 'Conversation'}</div>
          {conversation?.parcel && (
            <Link className="chat-thread-parcel" to={`/parcels/${conversation.parcel.slug || conversation.parcel._id}`}>
              {conversation.parcel.title}
            </Link>
          )}
        </div>
      </div>

      <div className="chat-thread-messages" ref={listRef}>
        {messages.length === 0 && <div className="chat-empty-note">Say hello — messages send instantly.</div>}
        {messages.map((m) => {
          const mine = (m.sender && (m.sender._id || m.sender)) === user.id;
          return (
            <div key={m._id} className={`chat-bubble-row ${mine ? 'chat-bubble-row-mine' : ''}`}>
              <div className={`chat-bubble ${mine ? 'chat-bubble-mine' : ''}`}>
                {m.body}
                <span className="chat-bubble-time">{timeLabel(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="error-box" style={{ margin: '0 14px' }}>{error}</div>}

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          maxLength={4000}
        />
        <button type="submit" className="btn-green" disabled={sending || !draft.trim()}>Send</button>
      </form>
    </div>
  );
}

export default function ChatDrawer() {
  const { user } = useAuth();
  const { canChat, drawerOpen, closeChat, openChat, activeConversationId, setActiveConversationId, conversations, totalUnread } = useChat();

  if (!canChat) return null;

  return (
    <>
      <button
        type="button"
        className="chat-launcher"
        onClick={() => openChat(activeConversationId)}
        aria-label="Open chat"
      >
        <ChatIcon size={22} />
        {totalUnread > 0 && <span className="chat-launcher-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </button>

      {drawerOpen && (
        <div className="chat-drawer-scrim" onClick={closeChat}>
          <div className="chat-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeChat} aria-label="Close chat">×</button>
            {activeConversationId ? (
              <ThreadView conversationId={activeConversationId} onBack={() => setActiveConversationId(null)} />
            ) : (
              <div className="chat-list">
                <div className="chat-list-header">Messages</div>
                {conversations.length === 0 && (
                  <div className="chat-empty-note">
                    {user.role === 'farmer'
                      ? 'Message a landowner from any listing page to start a conversation.'
                      : 'Conversations from interested farmers will show up here.'}
                  </div>
                )}
                {conversations.map((c) => (
                  <ConversationRow key={c._id} conversation={c} onOpen={setActiveConversationId} user={user} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
