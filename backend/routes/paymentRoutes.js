const express = require('express');
const router = express.Router();
const { refundPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.post('/:id/refund', protect, authorize('organizer', 'admin'), refundPayment);

module.exports = router;
