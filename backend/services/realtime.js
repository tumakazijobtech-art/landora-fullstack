// Small hub that owns the Socket.io server instance and a lightweight presence
// map, so routes/chat.js (a normal REST module) can emit realtime events and check
// who's currently online without an import cycle back into server.js. server.js
// calls init(io) once at boot; everything else here is safe to call before that
// (it just becomes a no-op) so requiring this module never blows up route files
// that get loaded before the socket server exists.

let ioInstance = null;
// userId (string) -> number of open sockets. A simple ref count, since one user can
// have the chat open in more than one tab/device at a time.
const onlineCounts = new Map();

function init(io) {
  ioInstance = io;
}

function markOnline(userId) {
  const key = String(userId);
  onlineCounts.set(key, (onlineCounts.get(key) || 0) + 1);
}

function markOffline(userId) {
  const key = String(userId);
  const next = (onlineCounts.get(key) || 1) - 1;
  if (next <= 0) onlineCounts.delete(key);
  else onlineCounts.set(key, next);
}

function isOnline(userId) {
  return onlineCounts.has(String(userId));
}

// Emits to every socket a user has joined (see server.js socket auth, which joins
// each connection to a `user:<id>` room). No-op — never throws — if Socket.io isn't
// initialized (e.g. this module is imported by a script that never boots the HTTP
// server, like scripts/createAdmin.js indirectly requiring a route file).
function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

function emitToConversation(conversationId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`conversation:${conversationId}`).emit(event, payload);
}

module.exports = { init, markOnline, markOffline, isOnline, emitToUser, emitToConversation };
