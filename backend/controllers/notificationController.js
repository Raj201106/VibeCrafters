const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc  List notifications for logged in user
// @route GET /api/notifications
const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, notifications, unreadCount });
});

// @desc  Mark a notification as read
// @route PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  res.json({ success: true, notification: notif });
});

// @desc  Mark all as read
// @route PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

// Helper used internally by other controllers/sockets to push a notification
const pushNotification = async ({ userId, type = 'push', title, message, meta }) => {
  return Notification.create({ user: userId, type, title, message, meta });
};

module.exports = { myNotifications, markRead, markAllRead, pushNotification };
