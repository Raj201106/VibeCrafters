const express = require('express');
const router = express.Router();
const { myNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, myNotifications);
router.patch('/:id/read', protect, markRead);
router.patch('/read-all', protect, markAllRead);

module.exports = router;
