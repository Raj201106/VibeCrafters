const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');
const Event = require('../models/Event');
const { canChat } = require('../utils/chatAuth');

// @desc  Get message history between the logged-in user and another user, for one event
// @route GET /api/chat/:eventId/:otherUserId
const getHistory = asyncHandler(async (req, res) => {
  const { eventId, otherUserId } = req.params;

  const allowed = req.user.role === 'admin' || (await canChat(eventId, req.user._id, otherUserId));
  if (!allowed) {
    res.status(403);
    throw new Error('You are not authorized to view this conversation.');
  }

  const messages = await ChatMessage.find({
    event: eventId,
    $or: [
      { sender: req.user._id, recipient: otherUserId },
      { sender: otherUserId, recipient: req.user._id },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(200);

  // Mark incoming messages as read now that the recipient has opened the thread
  await ChatMessage.updateMany(
    { event: eventId, sender: otherUserId, recipient: req.user._id, readAt: { $exists: false } },
    { readAt: new Date() }
  );

  res.json({ success: true, messages });
});

// @desc  List distinct conversation threads for the logged-in user (across all their events),
//        with the other participant's name and the most recent message — powers a chat inbox.
// @route GET /api/chat/threads
const listThreads = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const messages = await ChatMessage.find({ $or: [{ sender: userId }, { recipient: userId }] })
    .sort({ createdAt: -1 })
    .populate('sender', 'name')
    .populate('recipient', 'name')
    .populate('event', 'title slug')
    .limit(500);

  const threads = new Map();
  for (const m of messages) {
    const otherUser = String(m.sender._id) === String(userId) ? m.recipient : m.sender;
    const key = `${m.event._id}:${otherUser._id}`;
    if (!threads.has(key)) {
      threads.set(key, {
        eventId: m.event._id,
        eventTitle: m.event.title,
        eventSlug: m.event.slug,
        otherUser: { id: otherUser._id, name: otherUser.name },
        lastMessage: m.message,
        lastMessageAt: m.createdAt,
        unread: 0,
      });
    }
    const thread = threads.get(key);
    if (String(m.recipient._id) === String(userId) && !m.readAt) thread.unread += 1;
  }

  res.json({ success: true, threads: Array.from(threads.values()) });
});

module.exports = { getHistory, listThreads };
