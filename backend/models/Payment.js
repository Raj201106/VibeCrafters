const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // A single order can cover multiple tickets (e.g. booking 3 seats at once) — refunds and
    // status changes apply to every ticket in this array, not just the first one.
    tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    gateway: { type: String, default: 'razorpay' },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    invoiceNumber: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
