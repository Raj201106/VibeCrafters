const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');

/**
 * NOTE: Booking is instant (see ticketController.bookTickets) — there is no separate
 * checkout/payment-gateway step in this app. A "paid" Payment record is still created at
 * booking time purely for revenue reporting and so refunds have something to act on. This
 * controller only handles refunding an already-completed booking.
 */

// @desc  Refund a payment (admin/organizer initiated) — refunds every ticket in the order,
//        not just one, since a single order can cover multiple tickets.
// @route POST /api/payments/:id/refund
const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found.');
  }
  if (payment.status !== 'paid') {
    res.status(400);
    throw new Error('Only paid payments can be refunded.');
  }
  payment.status = 'refunded';
  await payment.save();
  await Ticket.updateMany({ _id: { $in: payment.tickets } }, { status: 'refunded' });
  res.json({ success: true, message: 'Refund processed.', payment });
});

module.exports = { refundPayment };
