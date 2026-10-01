const express = require('express');
const router = express.Router();
const { getHistory, listThreads } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/threads', protect, listThreads);
router.get('/:eventId/:otherUserId', protect, getHistory);

module.exports = router;
