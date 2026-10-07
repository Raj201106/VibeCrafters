const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const TicketType = require('../models/TicketType');
const Venue = require('../models/Venue');
const Feedback = require('../models/Feedback');

// @desc  Create event (draft)
// @route POST /api/events
// @access Organizer, Admin
const createEvent = asyncHandler(async (req, res) => {
  const { title, description, category, bannerUrl, venue, vendors, agenda, startDt, endDt, tags, ticketTypes } =
    req.body;

  if (!title || !description || !startDt || !endDt) {
    res.status(400);
    throw new Error('Title, description, start and end date are required.');
  }

  if (venue) {
    const venueDoc = await Venue.findById(venue);
    if (venueDoc && !venueDoc.isAvailable(startDt, endDt)) {
      res.status(409);
      throw new Error('Selected venue is already booked for the given dates.');
    }
  }

  const event = await Event.create({
    title,
    description,
    category,
    bannerUrl,
    venue,
    vendors,
    agenda,
    startDt,
    endDt,
    tags,
    organizer: req.user._id,
  });

  if (venue) {
    await Venue.findByIdAndUpdate(venue, {
      $push: { bookings: { event: event._id, startDt, endDt } },
    });
  }

  // Optionally create ticket tiers inline during the wizard's final step. Whitelist each tier
  // to name/price/quantity only — same reasoning as addTicketType: quantitySold and promoCodes
  // are system-managed and must never come from client input.
  if (Array.isArray(ticketTypes) && ticketTypes.length) {
    const docs = ticketTypes
      .filter((t) => t.name && t.price !== undefined && t.quantity !== undefined)
      .map((t) => ({ name: t.name, price: t.price, quantity: t.quantity, event: event._id }));
    if (docs.length) await TicketType.insertMany(docs);
  }

  res.status(201).json({ success: true, event });
});

// @desc  List/search events (public sees only published)
// @route GET /api/events
const listEvents = asyncHandler(async (req, res) => {
  const { q, category, status, mine, page = 1, limit = 12 } = req.query;
  const filter = {};

  if (req.user && mine === 'true') {
    filter.organizer = req.user._id;
  } else {
    filter.status = 'published';
  }

  if (status && req.user && ['admin', 'organizer'].includes(req.user.role)) filter.status = status;
  if (category) filter.category = category;
  if (q) filter.$text = { $search: q };

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('organizer', 'name email')
      .populate('venue', 'name city capacity')
      .sort({ startDt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Event.countDocuments(filter),
  ]);

  // One extra aggregation grouped by event, rather than a rating query per event (N+1) —
  // batches cleanly regardless of how many events are on this page.
  const ratingsByEvent = {};
  const ticketsSoldByEvent = {};

  if (events.length) {
    const ratingAgg = await Feedback.aggregate([
      { $match: { event: { $in: events.map((e) => e._id) } } },
      { $group: { _id: '$event', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    ratingAgg.forEach((r) => {
      ratingsByEvent[r._id] = { average: Math.round(r.avgRating * 10) / 10, count: r.count };
    });

    if (req.user && mine === 'true') {
      const ticketAgg = await TicketType.aggregate([
        { $match: { event: { $in: events.map((e) => e._id) } } },
        { $group: { _id: '$event', ticketsSold: { $sum: '$quantitySold' } } },
      ]);
      ticketAgg.forEach((t) => {
        ticketsSoldByEvent[t._id] = t.ticketsSold;
      });
    }
  }

  const eventsWithRatings = events.map((e) => ({
    ...e.toObject(),
    rating: ratingsByEvent[e._id] || { average: 0, count: 0 },
    ticketsSold: ticketsSoldByEvent[e._id] || 0,
  }));

  res.json({ success: true, events: eventsWithRatings, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// @desc  Get single event by slug (with ticket types). Drafts/cancelled events are only
//        visible to their owning organizer or an admin — everyone else gets a 404.
// @route GET /api/events/:slug
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug })
    .populate('organizer', 'name email avatarUrl')
    .populate('venue')
    .populate('vendors');

  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }

  const isOwnerOrAdmin =
    req.user && (String(event.organizer._id) === String(req.user._id) || req.user.role === 'admin');
  if (event.status !== 'published' && !isOwnerOrAdmin) {
    res.status(404);
    throw new Error('Event not found.');
  }

  const [ticketTypes, ratingAgg] = await Promise.all([
    TicketType.find({ event: event._id }),
    Feedback.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const rating = ratingAgg[0]
    ? { average: Math.round(ratingAgg[0].avgRating * 10) / 10, count: ratingAgg[0].count }
    : { average: 0, count: 0 };

  res.json({ success: true, event, ticketTypes, rating });
});

// @desc  Update event. Keeps the assigned venue's booking calendar in sync: if the venue or
//        dates change, the old reservation is removed/updated and a fresh availability check
//        runs (excluding this event's own existing booking, so re-saving unchanged dates never
//        false-conflicts with itself).
// @route PUT /api/events/:id
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to edit this event.');
  }

  const oldVenueId = event.venue ? String(event.venue) : null;
  const datesChanged = req.body.startDt !== undefined || req.body.endDt !== undefined;

  // Whitelist editable fields only — never let the request body set `organizer`, `status`,
  // `slug`, or other internal fields directly (status changes go through updateStatus below,
  // which validates ticket types exist before publishing).
  const editable = ['title', 'description', 'category', 'bannerUrl', 'venue', 'vendors', 'agenda', 'startDt', 'endDt', 'tags'];
  for (const field of editable) {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  }

  const newVenueId = event.venue ? String(event.venue) : null;
  const venueChanged = oldVenueId !== newVenueId;

  if (newVenueId && (venueChanged || datesChanged)) {
    const venueDoc = await Venue.findById(newVenueId);
    if (venueDoc) {
      const otherBookings = venueDoc.bookings.filter((b) => String(b.event) !== String(event._id));
      const conflict = otherBookings.some(
        (b) => new Date(event.startDt) < new Date(b.endDt) && new Date(event.endDt) > new Date(b.startDt)
      );
      if (conflict) {
        res.status(409);
        throw new Error('Selected venue is already booked for the given dates.');
      }
    }
  }

  if (venueChanged) {
    if (oldVenueId) {
      await Venue.findByIdAndUpdate(oldVenueId, { $pull: { bookings: { event: event._id } } });
    }
    if (newVenueId) {
      await Venue.findByIdAndUpdate(newVenueId, {
        $push: { bookings: { event: event._id, startDt: event.startDt, endDt: event.endDt } },
      });
    }
  } else if (newVenueId && datesChanged) {
    await Venue.updateOne(
      { _id: newVenueId, 'bookings.event': event._id },
      { $set: { 'bookings.$.startDt': event.startDt, 'bookings.$.endDt': event.endDt } }
    );
  }

  await event.save();
  res.json({ success: true, event });
});

// @desc  Change status: draft -> published -> completed / cancelled
// @route PATCH /api/events/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['draft', 'published', 'completed', 'cancelled'];
  if (!valid.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value.');
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  if (status === 'published') {
    const ticketTypeCount = await TicketType.countDocuments({ event: event._id });
    if (!ticketTypeCount) {
      res.status(400);
      throw new Error('Add at least one ticket type before publishing.');
    }
  }

  if (status === 'cancelled') {
    const Ticket = require('../models/Ticket');
    const Payment = require('../models/Payment');
    const { sendEmail } = require('../utils/email');
    
    // Find all active tickets
    const tickets = await Ticket.find({ event: event._id, status: { $in: ['reserved', 'booked'] } }).populate('user');
    for (const ticket of tickets) {
      ticket.status = 'refunded';
      await ticket.save();

      // Initiate stripe refund if it was paid
      if (ticket.priceAtPurchase > 0) {
        const payment = await Payment.findOne({ tickets: ticket._id, status: 'paid' });
        if (payment && payment.gatewayPaymentId && process.env.STRIPE_SECRET_KEY) {
          try {
             const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
             await stripe.refunds.create({
               payment_intent: payment.gatewayPaymentId,
               amount: Math.round(ticket.priceAtPurchase * 100),
             });
          } catch(e) { console.error('Stripe refund failed', e) }
        }
      }
      
      // Release inventory
      await TicketType.updateOne(
        { _id: ticket.ticketType, quantitySold: { $gte: 1 } },
        { $inc: { quantitySold: -1 } }
      );
      
      // Send cancellation email
      if (ticket.user) {
        const wrap = (title, bodyHtml) => `<div style="background:#FBF7EF;padding:32px 16px;font-family:Arial,sans-serif;"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #0F2A3D14;"><div style="background:linear-gradient(120deg, #C81E6E, #F5811F);padding:22px 28px;"><span style="color:#fff;font-size:20px;font-weight:700;">VibeCrafters</span></div><div style="padding:28px;color:#0F2A3D;"><h1 style="font-size:20px;margin:0 0 12px;color:#0F2A3D;">${title}</h1><div style="font-size:14px;line-height:1.6;color:#334;">${bodyHtml}</div></div></div></div>`;
        
        await sendEmail({
          to: ticket.user.email,
          subject: `Event Cancelled: ${event.title}`,
          html: wrap(
            'Event Cancelled',
            `Hi ${ticket.user.name.split(' ')[0]},<br/><br/>We regret to inform you that the event <b>${event.title}</b> has been cancelled by the organizer. Your ticket has been automatically refunded to your original payment method. Please allow a few days for the refund to reflect in your account.`
          )
        });
      }
    }
  }

  event.status = status;
  await event.save();
  res.json({ success: true, event });
});

// @desc  Delete event — only permitted while still a draft, to protect any tickets/payments
//        that may already reference a published event
// @route DELETE /api/events/:id
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }
  if (event.status !== 'draft') {
    res.status(400);
    throw new Error('Only draft events can be deleted. Cancel a published event instead.');
  }
  await event.deleteOne();
  await TicketType.deleteMany({ event: event._id });
  res.json({ success: true, message: 'Event deleted.' });
});

module.exports = { createEvent, listEvents, getEvent, updateEvent, updateStatus, deleteEvent };
