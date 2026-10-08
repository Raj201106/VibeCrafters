const mongoose = require('mongoose');

const vendorBookingSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'quoted', 'accepted', 'declined', 'paid'],
    default: 'pending',
  },
  message: {
    type: String,
  },
  quotedPrice: {
    type: Number,
  },
  quoteMessage: {
    type: String,
  },
  stripePaymentIntentId: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('VendorBooking', vendorBookingSchema);
