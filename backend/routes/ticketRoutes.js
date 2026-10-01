const express = require('express');
const router = express.Router();
const { bookTickets, verifyPayment, myTickets, checkIn, cancelTicket, refundTicket, downloadReceipt } = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

router.post('/book', protect, authorize('attendee', 'admin'), bookTickets);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my', protect, myTickets);
router.post('/check-in', protect, authorize('organizer', 'admin'), checkIn);
router.post('/:id/cancel', protect, cancelTicket);
router.post('/:id/refund', protect, authorize('organizer', 'admin'), refundTicket);
router.get('/:id/receipt', protect, downloadReceipt);

module.exports = router;
