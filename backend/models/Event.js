const mongoose = require('mongoose');

const agendaItemSchema = new mongoose.Schema(
  {
    time: String,
    title: String,
    speaker: String,
    description: String,
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['conference', 'concert', 'wedding', 'corporate', 'festival', 'workshop', 'other'],
      default: 'other',
    },
    bannerUrl: { type: String, default: '' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    agenda: [agendaItemSchema],
    startDt: { type: Date, required: true },
    endDt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'published', 'completed', 'cancelled'],
      default: 'draft',
    },
    tags: [{ type: String }],
    reminderSentAt: { type: Date },
  },
  { timestamps: true }
);

eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

eventSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 7);
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
