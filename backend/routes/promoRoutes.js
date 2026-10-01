const express = require('express');
const router = express.Router();
const { sendPromotion } = require('../controllers/promoController');
const { protect, authorize } = require('../middleware/auth');

// Admin-only: this sends a platform-wide blast (all attendees or all users), not scoped to a
// single organizer's own event — an organizer should not be able to email every user on the
// platform, so this is intentionally more restrictive than most other organizer-accessible routes.
router.post('/send', protect, authorize('admin'), sendPromotion);

module.exports = router;
