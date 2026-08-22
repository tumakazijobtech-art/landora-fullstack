import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const ChatContext = createContext(null);

// Derives the Socket.io origin: an explicit VITE_SOCKET_URL wins, otherwise strip a
// trailing /api off VITE_API_URL, otherwise fall back to same-origin (the Vite dev
// proxy forwards /socket.io to the backend — see vite.config.js).
function socketOrigin() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');
  return undefined; // same-origin
}

// Live chat between farmers and landowners about a specific parcel. Only
// farmers/landowners actually use conversations (see backend/routes/chat.js), so
// this provider simply does nothing for logged-out visitors or admins beyond
// exposing a no-op-safe API — nothing else in the app needs to branch on role.
export function ChatProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConversationRef = useRef(null);
  activeConversationRef.current = activeConversationId;

  const canChat = user && (user.role === 'farmer' || user.role === 'landowner');

  const refreshConversations = useCallback(() => {
    if (!token || !canChat) return;
    api.myConversations(token)
      .then((data) => {
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);
      })
      .catch(() => {});
  }, [token, canChat]);

  // Connect the socket once we have a session that's allowed to chat.
  useEffect(() => {
    if (!token || !canChat) {
      setSocket((s) => {
        if (s) s.disconnect();
        return null;
      });
      return;
    }

    const s = io(socketOrigin(), { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('chat:conversation-updated', () => refreshConversations());
    s.on('chat:message', ({ conversationId }) => {
      // Only bump unread counts for threads the user doesn't currently have open —
      // ChatDrawer marks the open thread read as messages arrive.
      if (conversationId !== activeConversationRef.current) refreshConversations();
    });

    refreshConversations();

    return () => s.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canChat]);

  function openChat(conversationId) {
    if (!canChat) return;
    setDrawerOpen(true);
    if (conversationId) setActiveConversationId(conversationId);
  }

  function closeChat() {
    setDrawerOpen(false);
  }

  // Starts (or resumes) the conversation with a parcel's landowner, then opens it —
  // used by the "Message the landowner" button on a parcel listing.
  async function startConversationForParcel(parcelId, applicationId) {
    const data = await api.startConversation({ parcelId, applicationId }, token);
    refreshConversations();
    openChat(data.conversation._id);
    return data.conversation;
  }

  return (
    <ChatContext.Provider
      value={{
        socket,
        canChat,
        conversations,
        totalUnread,
        drawerOpen,
        activeConversationId,
        setActiveConversationId,
        openChat,
        closeChat,
        refreshConversations,
        startConversationForParcel,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
