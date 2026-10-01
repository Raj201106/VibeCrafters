const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { canChat } = require('../utils/chatAuth');

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Registers Socket.io handlers for:
 *  - authenticated connection (reads the same httpOnly JWT cookie as REST auth)
 *  - joining a per-user "inbox" room for live notification pushes
 *  - joining a per-event chat room between an Organizer and an Attendee
 *  - sending/receiving chat messages, persisted to MongoDB
 */
function registerChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || '';
      const parsed = cookie.parse(rawCookie);
      const token = parsed[process.env.COOKIE_NAME || 'vc_token'];
      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    socket.join(`inbox:${user._id}`); // personal room for live notification/alert pushes

    socket.on('chat:join', async ({ eventId, otherUserId }) => {
      const allowed = user.role === 'admin' || (await canChat(eventId, user._id, otherUserId));
      if (!allowed) return socket.emit('chat:error', { message: 'You are not authorized to open this conversation.' });

      const room = [eventId, [user._id, otherUserId].sort().join('-')].join(':');
      socket.join(room);
      socket.data.room = room;
    });

    socket.on('chat:message', async ({ eventId, recipientId, message }) => {
      const trimmed = message?.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed) return;

      const allowed = user.role === 'admin' || (await canChat(eventId, user._id, recipientId));
      if (!allowed) return socket.emit('chat:error', { message: 'You are not authorized to message this user.' });

      const doc = await ChatMessage.create({
        event: eventId,
        sender: user._id,
        recipient: recipientId,
        message: trimmed,
      });

      const room = [eventId, [user._id, recipientId].sort().join('-')].join(':');
      io.to(room).emit('chat:message', {
        _id: doc._id,
        event: eventId,
        sender: { _id: user._id, name: user.name },
        recipient: recipientId,
        message: doc.message,
        createdAt: doc.createdAt,
      });

      // Live alert to recipient's inbox room even if they haven't opened the chat window
      io.to(`inbox:${recipientId}`).emit('notification:new', {
        title: `New message from ${user.name}`,
        message: doc.message,
      });
    });

    socket.on('disconnect', () => {
      // no-op; rooms are cleaned up automatically by Socket.io
    });
  });
}

/** Helper for other modules (e.g. eventController on status change) to push a live alert */
function emitToUser(io, userId, event, payload) {
  io.to(`inbox:${userId}`).emit(event, payload);
}

module.exports = { registerChatSocket, emitToUser };
