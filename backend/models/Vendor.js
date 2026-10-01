const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    serviceType: {
      type: String,
      enum: ['catering', 'decor', 'av_production', 'photography', 'security', 'entertainment', 'other'],
      required: true,
    },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    pricingNotes: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);
