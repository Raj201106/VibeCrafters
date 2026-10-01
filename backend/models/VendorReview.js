const mongoose = require('mongoose');

/**
 * A review an organizer leaves for a vendor they actually booked on a specific event.
 * Modeled the same way Feedback ties an attendee's rating to the event they attended —
 * this ties a rating to real usage (event + vendor + organizer) rather than being an
 * arbitrary standalone score, so Vendor.rating (see vendorController) can be computed
 * from genuine post-event experience instead of a manual admin guess.
 */
const vendorReviewSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

// One review per organizer, per vendor, per event — prevents spamming a vendor's score
// with repeated reviews for the same booking, while still allowing a fresh review if the
// same organizer books the same vendor again for a different event.
vendorReviewSchema.index({ vendor: 1, event: 1, organizer: 1 }, { unique: true });

module.exports = mongoose.model('VendorReview', vendorReviewSchema);
