const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { submitContact, listContacts } = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

// Public, unauthenticated, and sends an acknowledgement email to an address the caller
// controls — a strict per-IP limit prevents it being used to spam third-party inboxes.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', contactLimiter, submitContact);
router.get('/', protect, authorize('admin'), listContacts);

module.exports = router;
