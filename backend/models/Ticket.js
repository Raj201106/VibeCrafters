const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema(
  {
    ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, unique: true, default: () => uuidv4() },
    qrDataUrl: { type: String, default: '' }, // base64 PNG
    priceAtPurchase: { type: Number, required: true },
    promoCodeUsed: { type: String, default: '' },
    status: {
      type: String,
      enum: ['reserved', 'booked', 'checked-in', 'cancelled', 'refunded'],
      default: 'reserved',
    },
    checkedInAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
