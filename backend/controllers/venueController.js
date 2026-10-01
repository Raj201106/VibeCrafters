const asyncHandler = require('express-async-handler');
const Venue = require('../models/Venue');
const Event = require('../models/Event');

// @desc  Create venue
// @route POST /api/venues
const createVenue = asyncHandler(async (req, res) => {
  const { name, address, city, capacity, amenities, photos, vendor } = req.body;
  if (!name || !address || !city || !capacity) {
    res.status(400);
    throw new Error('Name, address, city, and capacity are required.');
  }
  const venue = await Venue.create({ name, address, city, capacity, amenities, photos, vendor });
  res.status(201).json({ success: true, venue });
});

// @desc  List venues (optionally filter by city/capacity)
// @route GET /api/venues
const listVenues = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.minCapacity) filter.capacity = { $gte: Number(req.query.minCapacity) };
  const venues = await Venue.find(filter).populate('vendor', 'name serviceType');
  res.json({ success: true, venues });
});

// @desc  Check venue availability for a date range
// @route GET /api/venues/:id/availability?start=&end=
const checkAvailability = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found.');
  }
  const { start, end } = req.query;
  const available = venue.isAvailable(start, end);
  res.json({ success: true, available, bookings: venue.bookings });
});

// @desc  Update venue — never accepts `bookings` directly from the client; that array is only
//        ever mutated by the booking flow in eventController when an event reserves a venue.
// @route PUT /api/venues/:id
const updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found.');
  }

  const editable = ['name', 'address', 'city', 'capacity', 'amenities', 'photos', 'vendor'];
  for (const field of editable) {
    if (req.body[field] !== undefined) venue[field] = req.body[field];
  }

  await venue.save();
  res.json({ success: true, venue });
});

// @desc  Delete a venue. Blocked if any non-finished event still depends on it, so
//        removing a venue from the shared directory can never silently orphan an
//        organizer's upcoming event (they'd have no venue info left to show attendees).
// @route DELETE /api/venues/:id
const deleteVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found.');
  }

  const dependentEvent = await Event.findOne({
    venue: venue._id,
    status: { $in: ['draft', 'published'] },
  }).select('title status');

  if (dependentEvent) {
    res.status(400);
    throw new Error(
      `Can't delete this venue — it's still assigned to "${dependentEvent.title}" (${dependentEvent.status}). Reassign or cancel that event first.`
    );
  }

  await venue.deleteOne();
  res.json({ success: true, message: 'Venue deleted.' });
});

module.exports = { createVenue, listVenues, checkAvailability, updateVenue, deleteVenue };
