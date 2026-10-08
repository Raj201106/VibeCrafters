const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');

// @desc  Overview KPIs for admin/organizer dashboard
// @route GET /api/reports/overview
const overview = asyncHandler(async (req, res) => {
  const organizerFilter = req.user.role === 'organizer' ? { organizer: req.user._id } : {};
  const eventIds = (await Event.find(organizerFilter).select('_id')).map((e) => e._id);

  const [totalEvents, published, totalTicketsSold, revenueAgg, checkIns] = await Promise.all([
    Event.countDocuments(organizerFilter),
    Event.countDocuments({ ...organizerFilter, status: 'published' }),
    // Exclude cancelled AND refunded tickets from sold count
    Ticket.countDocuments({ event: { $in: eventIds }, status: { $in: ['booked', 'checked-in'] } }),
    // Sum priceAtPurchase of ALL active tickets to get perfectly accurate net revenue
    Ticket.aggregate([
      { $match: { event: { $in: eventIds }, status: { $in: ['booked', 'checked-in'] } } },
      { $group: { _id: null, total: { $sum: '$priceAtPurchase' } } },
    ]),
    Ticket.countDocuments({ event: { $in: eventIds }, status: 'checked-in' }),
  ]);

  const netRevenue = revenueAgg[0]?.total || 0;

  res.json({
    success: true,
    kpis: {
      totalEvents,
      published,
      totalTicketsSold,
      totalRevenue: netRevenue,
      totalCheckIns: checkIns,
    },
  });
});

// @desc  Sales & revenue over time (for charts)
// @route GET /api/reports/sales-trend
const salesTrend = asyncHandler(async (req, res) => {
  const organizerFilter = req.user.role === 'organizer' ? { organizer: req.user._id } : {};
  const eventIds = (await Event.find(organizerFilter).select('_id')).map((e) => e._id);

  const trend = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $lookup: { from: 'tickets', localField: 'tickets', foreignField: '_id', as: 'ticketDocs' } },
    { $match: { 'ticketDocs.event': { $in: eventIds } } },
    // Only count tickets that are still active (not cancelled/refunded)
    { $addFields: { activeTickets: { $filter: { input: '$ticketDocs', as: 'td', cond: { $not: [{ $in: ['$$td.status', ['cancelled', 'refunded']] }] } } } } },
    { $match: { $expr: { $gt: [{ $size: '$activeTickets' }, 0] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: { $sum: '$activeTickets.priceAtPurchase' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, trend });
});

// @desc  Per-event breakdown (sales, attendance, feedback) — restricted to the event's own
//        organizer or an admin, since organizer accounts are self-service signups and this
//        exposes another organizer's revenue and feedback data if left open by role alone.
// @route GET /api/reports/events/:eventId
const eventReport = asyncHandler(async (req, res) => {
  const eventDoc = await Event.findById(req.params.eventId).select('organizer');
  if (!eventDoc) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(eventDoc.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this event\'s report.');
  }

  const eventId = new mongoose.Types.ObjectId(req.params.eventId);

  const [sales, attendance, feedback] = await Promise.all([
    // Only count active (booked/checked-in) tickets for revenue reporting per tier
    Ticket.aggregate([
      { $match: { event: eventId, status: { $in: ['booked', 'checked-in'] } } },
      { $group: { _id: '$ticketType', count: { $sum: 1 }, revenue: { $sum: '$priceAtPurchase' } } },
      { $lookup: { from: 'tickettypes', localField: '_id', foreignField: '_id', as: 'type' } },
      { $unwind: '$type' },
      { $project: { name: '$type.name', count: 1, revenue: 1 } },
    ]),
    // Show full breakdown including cancelled/refunded for transparency
    Ticket.aggregate([
      { $match: { event: eventId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Feedback.aggregate([
      { $match: { event: eventId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    salesByTier: sales,
    attendanceByStatus: attendance,
    feedback: feedback[0] || { avgRating: 0, count: 0 },
  });
});

// @desc  Submit feedback
// @route POST /api/reports/feedback
// @desc  Submit or update feedback for an event you actually attended. Validated explicitly
//        here because findOneAndUpdate with upsert:true bypasses Mongoose schema validators —
//        without this check, a crafted request could write an out-of-range rating (e.g. -50)
//        straight into the average-rating calculation used across the reports above.
// @route POST /api/reports/feedback
const submitFeedback = asyncHandler(async (req, res) => {
  const { eventId, rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be a whole number between 1 and 5.');
  }
  if (comment && comment.length > 1000) {
    res.status(400);
    throw new Error('Comment is too long (1000 characters max).');
  }

  const attended = await Ticket.exists({ event: eventId, user: req.user._id, status: { $ne: 'cancelled' } });
  if (!attended) {
    res.status(403);
    throw new Error("You can only rate events you've booked a ticket for.");
  }

  const feedback = await Feedback.findOneAndUpdate(
    { event: eventId, user: req.user._id },
    { rating, comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true, feedback });
});

// @desc  Get the logged-in attendee's own feedback for one event, if they've left any —
//        lets the UI pre-fill an existing rating instead of always starting blank.
// @route GET /api/reports/feedback/:eventId
const getMyFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOne({ event: req.params.eventId, user: req.user._id });
  res.json({ success: true, feedback: feedback || null });
});

// @desc  Get recent ticket bookings/cancellations across all events for the organizer
// @route GET /api/reports/recent-orders
const recentOrders = asyncHandler(async (req, res) => {
  const organizerFilter = req.user.role === 'organizer' ? { organizer: req.user._id } : {};
  const eventIds = (await Event.find(organizerFilter).select('_id')).map((e) => e._id);

  const orders = await Ticket.find({ event: { $in: eventIds } })
    .populate('user', 'name email')
    .populate('event', 'title')
    .populate('ticketType', 'name')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({ success: true, orders });
});

module.exports = { overview, salesTrend, eventReport, submitFeedback, getMyFeedback, recentOrders };
