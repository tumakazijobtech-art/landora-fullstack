const express = require('express');
const { body, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Parcel = require('../models/Parcel');
const { requireAuth, requireRole } = require('../middleware/auth');
const realtime = require('../services/realtime');
const { notifySms } = require('../services/sms');

const router = express.Router();

const CONVO_POPULATE = [
  { path: 'parcel', select: 'title county location photos slug status' },
  { path: 'farmer', select: 'name profilePicture phone' },
  { path: 'landowner', select: 'name profilePicture phone' },
];

function isParticipant(conversation, userId) {
  return [String(conversation.farmer), String(conversation.landowner)].includes(String(userId));
}

// Farmer: start (or fetch, if it already exists) the conversation with a parcel's
// landowner. Landowners/admins don't start conversations this way — they reply
// inside one a farmer already opened (see the message-send route below, which is
// open to either party once a conversation exists).
router.post(
  '/conversations',
  requireAuth,
  requireRole('farmer'),
  [body('parcelId').isMongoId(), body('applicationId').optional({ checkFalsy: true }).isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const parcel = await Parcel.findById(req.body.parcelId);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    let conversation = await Conversation.findOne({ parcel: parcel._id, farmer: req.user._id });
    if (!conversation) {
      conversation = await Conversation.create({
        parcel: parcel._id,
        farmer: req.user._id,
        landowner: parcel.owner,
        application: req.body.applicationId || null,
      });
    } else if (req.body.applicationId && !conversation.application) {
      conversation.application = req.body.applicationId;
      await conversation.save();
    }

    await conversation.populate(CONVO_POPULATE);
    res.status(201).json({ conversation });
  }
);

// Either party: my conversations, most recent activity first.
router.get('/conversations', requireAuth, requireRole('farmer', 'landowner'), async (req, res) => {
  const filter = req.user.role === 'farmer' ? { farmer: req.user._id } : { landowner: req.user._id };
  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate(CONVO_POPULATE)
    .lean();

  const unreadField = req.user.role === 'farmer' ? 'unreadForFarmer' : 'unreadForLandowner';
  res.json({
    conversations: conversations.map((c) => ({ ...c, unreadCount: c[unreadField] || 0 })),
    totalUnread: conversations.reduce((sum, c) => sum + (c[unreadField] || 0), 0),
  });
});

async function loadOwnedConversation(req, res) {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return null;
  }
  if (!isParticipant(conversation, req.user._id) && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Not permitted to view this conversation' });
    return null;
  }
  return conversation;
}

// Message history for one conversation, oldest first, simple page-back pagination
// via `before` (an ISO date/message id createdAt cursor).
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const conversation = await loadOwnedConversation(req, res);
  if (!conversation) return;

  const filter = { conversation: conversation._id };
  if (req.query.before) {
    const beforeDate = new Date(req.query.before);
    if (!Number.isNaN(beforeDate.getTime())) filter.createdAt = { $lt: beforeDate };
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name profilePicture')
    .lean();

  res.json({ messages: messages.reverse() });
});

// Either party: send a message. Pushed live over Socket.io to anyone with the
// conversation open; if the recipient isn't currently connected at all, they also
// get an SMS nudge (a no-op if SMS_WEBHOOK_URL isn't configured — chat still works
// perfectly without it).
router.post(
  '/conversations/:id/messages',
  requireAuth,
  [body('body').trim().isLength({ min: 1, max: 4000 }).withMessage('Message cannot be empty')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const conversation = await loadOwnedConversation(req, res);
    if (!conversation) return;

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      body: req.body.body,
    });
    await message.populate('sender', 'name profilePicture');

    const isFarmerSender = String(conversation.farmer) === String(req.user._id);
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessageSnippet = req.body.body.slice(0, 240);
    conversation.lastMessageSender = req.user._id;
    if (isFarmerSender) conversation.unreadForLandowner += 1;
    else conversation.unreadForFarmer += 1;
    await conversation.save();

    res.status(201).json({ message });

    // Realtime push to anyone with this conversation open right now.
    realtime.emitToConversation(conversation._id, 'chat:message', {
      conversationId: String(conversation._id),
      message,
    });

    // Nudge the other party's conversation list even if they don't have this
    // specific thread open.
    const recipientId = isFarmerSender ? conversation.landowner : conversation.farmer;
    realtime.emitToUser(recipientId, 'chat:conversation-updated', { conversationId: String(conversation._id) });

    // SMS fallback only if the recipient has no active connection at all (avoids
    // spamming someone who is already looking at the chat).
    if (!realtime.isOnline(recipientId)) {
      const populated = await conversation.populate(CONVO_POPULATE);
      const recipient = isFarmerSender ? populated.landowner : populated.farmer;
      const parcelTitle = populated.parcel ? populated.parcel.title : 'your Landora listing';
      if (recipient && recipient.phone) {
        notifySms(
          recipient.phone,
          `Landora: New message about "${parcelTitle}" from ${req.user.name}. Open the app to reply.`,
          { purpose: 'chat_message' }
        );
      }
    }
  }
);

// Either party: mark a conversation as read (resets their own unread counter).
router.patch('/conversations/:id/read', requireAuth, async (req, res) => {
  const conversation = await loadOwnedConversation(req, res);
  if (!conversation) return;

  if (String(conversation.farmer) === String(req.user._id)) conversation.unreadForFarmer = 0;
  else conversation.unreadForLandowner = 0;
  await conversation.save();

  res.json({ ok: true });
});

module.exports = router;
