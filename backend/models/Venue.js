const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    capacity: { type: Number, required: true },
    amenities: [{ type: String }],
    photos: [{ type: String }],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    // Simple availability calendar: array of booked date ranges
    bookings: [
      {
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        startDt: Date,
        endDt: Date,
      },
    ],
  },
  { timestamps: true }
);

venueSchema.methods.isAvailable = function (startDt, endDt) {
  return !this.bookings.some(
    (b) => new Date(startDt) < new Date(b.endDt) && new Date(endDt) > new Date(b.startDt)
  );
};

module.exports = mongoose.model('Venue', venueSchema);
