const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const VendorReview = require('../models/VendorReview');
const Event = require('../models/Event');

// @desc  Onboard a vendor profile
// @route POST /api/vendors
const createVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, vendor });
});

// @desc  List vendors. The public and other vendors only ever see approved listings — contact
//        details shouldn't be visible before an admin has vetted a submission. A vendor can
//        still see their own listing while pending, and an admin can see everything (used by
//        the admin approvals dashboard).
// @route GET /api/vendors
const listVendors = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.serviceType) filter.serviceType = req.query.serviceType;

  if (req.user?.role === 'admin') {
    if (req.query.approved !== undefined) filter.approved = req.query.approved === 'true';
    // else: admin with no explicit filter sees everything, approved and pending alike
  } else if (req.user) {
    filter.$or = [{ approved: true }, { user: req.user._id }];
  } else {
    filter.approved = true;
  }

  const vendors = await Vendor.find(filter).sort({ rating: -1 });
  res.json({ success: true, vendors });
});

// @desc  Approve a vendor (admin)
// @route PATCH /api/vendors/:id/approve
const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found.');
  }
  res.json({ success: true, vendor });
});

// @desc  Update vendor profile
// @route PUT /api/vendors/:id
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found.');
  }
  if (String(vendor.user) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  // Whitelist — a vendor editing their own listing must never be able to set `approved` or
  // `rating` themselves (those are admin/system-controlled), or reassign `user` to someone else.
  const editable = ['name', 'serviceType', 'contactEmail', 'contactPhone', 'pricingNotes'];
  for (const field of editable) {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  }
  if (req.body.approved !== undefined && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only an admin can approve a vendor.');
  }
  if (req.body.rating !== undefined && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only an admin can rate a vendor.');
  }
  if (req.user.role === 'admin') {
    if (req.body.approved !== undefined) vendor.approved = req.body.approved;
    if (req.body.rating !== undefined) {
      // Manual override — useful to seed a brand-new vendor with no bookings yet. Once real
      // organizer reviews start coming in via reviewVendor(), recomputeVendorRating() takes
      // over and this manually-set value gets superseded by the genuine average.
      const rating = Number(req.body.rating);
      if (Number.isNaN(rating) || rating < 0 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be a number between 0 and 5.');
      }
      vendor.rating = rating;
    }
  }

  await vendor.save();
  res.json({ success: true, vendor });
});

// Recomputes and persists a vendor's average rating from real reviews. Called after every
// review write so Vendor.rating (used for directory sort order) always reflects actual
// post-event feedback rather than an admin's one-time guess going stale.
const recomputeVendorRating = async (vendorId) => {
  const agg = await VendorReview.aggregate([
    { $match: { vendor: vendorId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);
  await Vendor.findByIdAndUpdate(vendorId, { rating: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0 });
};

// @desc  Leave a review for a vendor the organizer actually booked. Only allowed once the
//        event has been marked completed (see updateStatus in eventController) — reviewing
//        a vendor before the event even happened wouldn't reflect real experience.
// @route POST /api/vendors/:id/reviews
const reviewVendor = asyncHandler(async (req, res) => {
  const { eventId, rating, comment } = req.body;
  if (!eventId || !rating) {
    res.status(400);
    throw new Error('eventId and rating are required.');
  }

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the organizer of this event can review its vendors.');
  }
  if (event.status !== 'completed') {
    res.status(400);
    throw new Error('You can only review vendors after the event is marked completed.');
  }
  if (!event.vendors.some((v) => String(v) === req.params.id)) {
    res.status(400);
    throw new Error('This vendor was not booked on that event.');
  }

  let review;
  try {
    review = await VendorReview.create({
      vendor: req.params.id,
      event: eventId,
      organizer: req.user._id,
      rating,
      comment: comment || '',
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error("You've already reviewed this vendor for this event.");
    }
    throw err;
  }

  await recomputeVendorRating(req.params.id);
  res.status(201).json({ success: true, review });
});

// @desc  List reviews for a vendor (rating + comment only — reviewer identity is withheld
//        so feedback stays candid, same reasoning as why vendor contact info stays gated
//        until approval). Used to show *why* a vendor has the score it does.
// @route GET /api/vendors/:id/reviews
const getVendorReviews = asyncHandler(async (req, res) => {
  const reviews = await VendorReview.find({ vendor: req.params.id })
    .populate('event', 'title')
    .select('rating comment event createdAt')
    .sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

module.exports = { createVendor, listVendors, approveVendor, updateVendor, reviewVendor, getVendorReviews };
