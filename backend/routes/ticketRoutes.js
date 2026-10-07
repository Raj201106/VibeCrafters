const express = require('express');
const router = express.Router();
const { bookTickets, verifyPayment, myTickets, checkIn, cancelTicket, refundTicket, downloadReceipt } = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Strict rate limit: Max 5 booking attempts per 15 minutes per IP
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many booking attempts. Please complete your existing checkouts or try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/book', protect, authorize('attendee', 'admin'), bookingLimiter, bookTickets);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my', protect, myTickets);
router.post('/check-in', protect, authorize('organizer', 'admin'), checkIn);
router.post('/:id/cancel', protect, cancelTicket);
router.post('/:id/refund', protect, authorize('organizer', 'admin'), refundTicket);
router.get('/:id/receipt', protect, downloadReceipt);

module.exports = router;
