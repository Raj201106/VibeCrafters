const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true }, // General / VIP / Early-bird
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    quantitySold: { type: Number, default: 0, min: 0 },
    promoCodes: [
      {
        code: String,
        percentOff: Number,
        maxUses: Number,
        usedCount: { type: Number, default: 0 },
        expiresAt: Date,
      },
    ],
  },
  { timestamps: true }
);

ticketTypeSchema.virtual('available').get(function () {
  return Math.max(this.quantity - this.quantitySold, 0);
});
ticketTypeSchema.set('toJSON', { virtuals: true });
ticketTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TicketType', ticketTypeSchema);
