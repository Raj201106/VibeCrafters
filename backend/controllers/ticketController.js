const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const TicketType = require('../models/TicketType');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const { generateTicketQR } = require('../utils/qrGenerator');
const { sendBookingConfirmationEmail } = require('../utils/email');
const { pushNotification } = require('./notificationController');
const { sendSMS } = require('../utils/sms');
const { BRAND, drawBrandHeader } = require('../utils/pdfBrand');

// @desc  Add a ticket type/tier to an event
// @route POST /api/events/:eventId/ticket-types
const addTicketType = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  // Whitelist — never trust the client for `quantitySold` or `promoCodes`; both are
  // system-managed (quantitySold only ever changes via the atomic booking/cancel flows).
  const { name, price, quantity } = req.body;
  if (!name || price === undefined || quantity === undefined) {
    res.status(400);
    throw new Error('Name, price, and quantity are required.');
  }
  const ticketType = await TicketType.create({ name, price, quantity, event: event._id });
  res.status(201).json({ success: true, ticketType });
});

// @desc  List ticket types for an event
// @route GET /api/events/:eventId/ticket-types
const listTicketTypes = asyncHandler(async (req, res) => {
  const ticketTypes = await TicketType.find({ event: req.params.eventId });
  res.json({ success: true, ticketTypes });
});

/** Shared ownership check used by update/delete below. */
const assertOwnsTicketType = async (ticketTypeId, user) => {
  const ticketType = await TicketType.findById(ticketTypeId);
  if (!ticketType) {
    const err = new Error('Ticket type not found.');
    err.statusCode = 404;
    throw err;
  }
  const event = await Event.findById(ticketType.event);
  if (!event || (String(event.organizer) !== String(user._id) && user.role !== 'admin')) {
    const err = new Error('Not authorized.');
    err.statusCode = 403;
    throw err;
  }
  return { ticketType, event };
};

// @desc  Update a ticket type (name/price/quantity). Quantity can't drop below units already sold.
// @route PUT /api/events/:eventId/ticket-types/:id
const updateTicketType = asyncHandler(async (req, res) => {
  const { ticketType } = await assertOwnsTicketType(req.params.id, req.user).catch((e) => {
    res.status(e.statusCode || 500);
    throw e;
  });

  const { name, price, quantity } = req.body;
  if (name !== undefined) ticketType.name = name;
  if (price !== undefined) ticketType.price = price;
  if (quantity !== undefined) {
    if (Number(quantity) < ticketType.quantitySold) {
      res.status(400);
      throw new Error(`Quantity can't be less than the ${ticketType.quantitySold} already sold.`);
    }
    ticketType.quantity = quantity;
  }
  await ticketType.save();
  res.json({ success: true, ticketType });
});

// @desc  Delete a ticket type — blocked once any tickets have been sold, to protect buyers.
// @route DELETE /api/events/:eventId/ticket-types/:id
const deleteTicketType = asyncHandler(async (req, res) => {
  const { ticketType } = await assertOwnsTicketType(req.params.id, req.user).catch((e) => {
    res.status(e.statusCode || 500);
    throw e;
  });

  if (ticketType.quantitySold > 0) {
    res.status(400);
    throw new Error("This tier has tickets sold and can't be deleted. Set its quantity to 0 instead to stop new sales.");
  }
  await ticketType.deleteOne();
  res.json({ success: true, message: 'Ticket tier deleted.' });
});

// @desc  Book tickets instantly — no separate payment/checkout step. Generates QR codes,
//        records a "paid" Payment for revenue reporting, sends a confirmation email, and
//        returns everything needed to render an immediate receipt.
// @route POST /api/tickets/book
// @body { ticketTypeId, quantity, promoCode }
const bookTickets = asyncHandler(async (req, res) => {
  const { ticketTypeId, quantity = 1, promoCode } = req.body;

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    res.status(400);
    throw new Error('Quantity must be a whole number between 1 and 10.');
  }

  const preview = await TicketType.findById(ticketTypeId);
  if (!preview) {
    res.status(404);
    throw new Error('Ticket type not found.');
  }

  let unitPrice = preview.price;
  let appliedCode = '';
  let promo = null;
  if (promoCode) {
    // This lookup is just for a fast "does this code exist" rejection and to read percentOff
    // (which never changes concurrently). It is NOT the source of truth for whether the code
    // still has uses left — that's enforced atomically below, at the same moment as the
    // increment, so two simultaneous bookings can't both slip through on the last use.
    promo = preview.promoCodes.find(
      (p) => p.code.toLowerCase() === promoCode.toLowerCase() && (!p.expiresAt || p.expiresAt > new Date())
    );
    if (!promo) {
      res.status(400);
      throw new Error('Invalid or expired promo code.');
    }
    unitPrice = +(unitPrice * (1 - promo.percentOff / 100)).toFixed(2);
    appliedCode = promo.code;
  }

  // Atomically reserve inventory in a single conditional update — the $expr guard only lets
  // the write through if enough tickets are still unsold at the exact moment MongoDB applies
  // it. This closes a race condition where two simultaneous requests could both read "1 seat
  // left", both pass a naive check, and both succeed — overselling the tier. Whichever request
  // loses the race gets a null result here and is rejected cleanly, no partial state written.
  const ticketType = await TicketType.findOneAndUpdate(
    { _id: ticketTypeId, $expr: { $gte: [{ $subtract: ['$quantity', '$quantitySold'] }, quantity] } },
    { $inc: { quantitySold: quantity } },
    { new: true }
  );

  if (!ticketType) {
    res.status(409);
    throw new Error('Not enough tickets left for this tier — someone may have just booked them.');
  }

  // Same problem, same fix, for the promo code: atomically check-and-increment usedCount in
  // one step, guarded by $expr so the condition (enough uses left for the FULL quantity being
  // booked, and not expired) is evaluated at the exact moment of the write — not against a
  // stale snapshot read earlier. Without this, two concurrent bookings could each pass a
  // "usedCount < maxUses" check individually and jointly over-redeem past the cap; worse, the
  // old check never even accounted for `quantity`, so a single request booking 3 tickets
  // against a promo with 1 use left would have passed the check and then exceeded the cap by 2
  // even with no concurrency involved at all.
  if (appliedCode) {
    const promoResult = await TicketType.updateOne(
      {
        _id: ticketTypeId,
        promoCodes: {
          $elemMatch: {
            code: appliedCode,
            $expr: {
              $and: [
                { $lte: [{ $add: ['$usedCount', quantity] }, '$maxUses'] },
                { $or: [{ $eq: [{ $ifNull: ['$expiresAt', null] }, null] }, { $gt: ['$expiresAt', new Date()] }] },
              ],
            },
          },
        },
      },
      { $inc: { 'promoCodes.$[elem].usedCount': quantity } },
      { arrayFilters: [{ 'elem.code': appliedCode }] }
    );

    if (promoResult.modifiedCount === 0) {
      // Promo hit its cap, expired, or lost a race between validation and now. We already
      // reserved ticket inventory above — give it back before failing, since no tickets have
      // been created yet at this point.
      await TicketType.updateOne({ _id: ticketTypeId }, { $inc: { quantitySold: -quantity } }).catch(() => {});
      res.status(409);
      throw new Error('This promo code just reached its usage limit. Try again without it or with fewer tickets.');
    }
  }

  // Inventory (and, if applicable, the promo code) is now reserved. If anything below fails, we must give it back rather than
  // leave phantom sold-out seats that were never actually issued to anyone. Declared outside
  // the try block so the catch block can see how many tickets were actually created before
  // the failure — a variable declared with const/let inside try is NOT visible in catch.
  const tickets = [];
  try {
    for (let i = 0; i < quantity; i++) {
      const t = await Ticket.create({
        ticketType: ticketType._id,
        event: ticketType.event,
        user: req.user._id,
        priceAtPurchase: unitPrice,
        promoCodeUsed: appliedCode,
        status: 'reserved',
      });
      // QR will be generated upon payment success to avoid DB bloat on abandoned checkouts
      tickets.push(t);
    }

    const totalAmount = +(unitPrice * quantity).toFixed(2);
    
    const payment = await Payment.create({
      tickets: tickets.map((t) => t._id),
      user: req.user._id,
      amount: totalAmount,
      currency: 'INR',
      status: totalAmount > 0 ? 'created' : 'paid',
      gateway: 'stripe',
      invoiceNumber: 'INV-' + Date.now(),
    });

    const event = await Event.findById(ticketType.event);
    let stripeUrl = null;

    if (totalAmount > 0) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Payment gateway not configured.');
      }
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: event.title,
                description: `Tier: ${ticketType.name}`,
              },
              unit_amount: Math.round(unitPrice * 100), // in paise
            },
            quantity: quantity,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/receipt?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment._id}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/events/${event.slug}`,
      });
      payment.gatewayOrderId = session.id;
      await payment.save();
      stripeUrl = session.url;
    }

    if (totalAmount === 0) {
      // Free ticket, confirm immediately
      for (const t of tickets) {
        t.status = 'booked';
        t.qrDataUrl = await generateTicketQR(t._id, t.event, t.code);
        await t.save();
      }
      sendBookingConfirmationEmail(req.user, event, payment).catch((e) =>
        console.error('Booking confirmation email failed:', e.message)
      );
      pushNotification({
        userId: req.user._id,
        title: 'Booking confirmed 🎉',
        message: `${quantity} ticket${quantity > 1 ? 's' : ''} for ${event.title} — ready in My Tickets.`,
      }).catch(() => {});

      const io = req.app.get('io');
      if (io) io.to(`inbox:${req.user._id}`).emit('notification:new', { title: 'Booking confirmed 🎉', message: event.title });
    }

    res.status(201).json({ success: true, tickets, payment, totalAmount, unitPrice, event, stripeUrl });
  } catch (err) {
    // A booking is all-or-nothing: if the loop above failed partway through, delete any
    // tickets it already created (they were never actually paid for) before restoring the
    // full reserved quantity — otherwise we'd leave orphaned tickets AND double-count that
    // inventory as available again for someone else to book. The promo code reservation
    // (if any) was also taken atomically before this point, so it must be given back too.
    if (tickets.length) {
      await Ticket.deleteMany({ _id: { $in: tickets.map((t) => t._id) } }).catch(() => {});
    }
    await TicketType.updateOne({ _id: ticketTypeId }, { $inc: { quantitySold: -quantity } }).catch(() => {});
    if (appliedCode) {
      await TicketType.updateOne(
        { _id: ticketTypeId, 'promoCodes.code': appliedCode },
        { $inc: { 'promoCodes.$.usedCount': -quantity } }
      ).catch(() => {});
    }
    throw err;
  }
});

// @desc  Get "My Tickets" for logged-in attendee
// @route GET /api/tickets/my
const myTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user._id, status: { $ne: 'reserved' } })
    .populate({
      path: 'event',
      select: 'title slug startDt endDt bannerUrl status organizer',
      populate: { path: 'organizer', select: 'name' },
    })
    .populate('ticketType', 'name price')
    .sort({ createdAt: -1 });
  res.json({ success: true, tickets });
});

// @desc  Check-in via QR scan (organizer/admin scans at venue). Restricted to the event's own
//        organizer or an admin — another organizer can't check in tickets for someone else's event.
// @route POST /api/tickets/check-in
// @body { ticketId } or { code }
const checkIn = asyncHandler(async (req, res) => {
  const { ticketId, code } = req.body;
  const ticket = await Ticket.findOne(ticketId ? { _id: ticketId } : { code })
    .populate('event', 'title organizer')
    .populate('user', 'name email')
    .populate('ticketType', 'name');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found.');
  }
  if (String(ticket.event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to check in tickets for this event.');
  }
  if (ticket.status === 'checked-in') {
    res.status(409);
    throw new Error('Ticket already checked in at ' + ticket.checkedInAt);
  }
  if (ticket.status !== 'booked') {
    res.status(400);
    throw new Error(`Ticket cannot be checked in (status: ${ticket.status}).`);
  }

  ticket.status = 'checked-in';
  ticket.checkedInAt = new Date();
  await ticket.save();

  res.json({ success: true, message: 'Checked in successfully.', ticket });
});

// @desc  Cancel a booked ticket (attendee-initiated, triggers refund flow)
// @route POST /api/tickets/:id/cancel
// @desc  Cancel a booked ticket (attendee-initiated, triggers refund flow). Only a currently
//        "booked" ticket can be cancelled — without this guard, calling this endpoint
//        repeatedly on an already-cancelled ticket would decrement quantitySold every time,
//        corrupting inventory and eventually reporting near-infinite fake availability.
// @route POST /api/tickets/:id/cancel
const cancelTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found.');
  }
  if (String(ticket.user) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }
  if (ticket.status !== 'booked') {
    res.status(400);
    throw new Error(`This ticket can't be cancelled (current status: ${ticket.status}).`);
  }
  ticket.status = 'cancelled';
  await ticket.save();
  await TicketType.updateOne(
    { _id: ticket.ticketType, quantitySold: { $gte: 1 } },
    { $inc: { quantitySold: -1 } }
  );

  const event = await Event.findById(ticket.event);
  if (event) {
    pushNotification({
      userId: event.organizer,
      title: 'Ticket Cancelled',
      message: `A ticket for ${event.title} was cancelled.`,
    }).catch(() => {});
    const io = req.app.get('io');
    if (io) io.to(`inbox:${event.organizer.toString()}`).emit('notification:new', { title: 'Ticket Cancelled', message: event.title });
  }

  res.json({ success: true, message: 'Ticket cancelled. Refund will be processed if applicable.' });
});

// @desc  Refund a cancelled ticket (organizer-initiated)
// @route POST /api/tickets/:id/refund
const refundTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('event');
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found.');
  }
  if (String(ticket.event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to refund tickets for this event.');
  }
  if (ticket.status !== 'cancelled') {
    res.status(400);
    throw new Error(`Ticket is ${ticket.status}. Only cancelled tickets can be refunded.`);
  }

  // Attempt Stripe refund if there was a payment
  if (ticket.priceAtPurchase > 0) {
    const payment = await Payment.findOne({ tickets: ticket._id, status: 'paid' });
    if (payment && payment.gatewayPaymentId && process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      try {
        await stripe.refunds.create({
          payment_intent: payment.gatewayPaymentId,
          amount: Math.round(ticket.priceAtPurchase * 100),
        });
      } catch (err) {
        console.error('Stripe refund failed:', err.message);
        res.status(400);
        throw new Error('Stripe refund failed: ' + err.message);
      }
    }
  }

  ticket.status = 'refunded';
  await ticket.save();

  pushNotification({
    userId: ticket.user,
    title: 'Ticket Refunded',
    message: `Your ticket for ${ticket.event.title} has been refunded by the organizer.`,
  }).catch(() => {});
  const io = req.app.get('io');
  if (io) io.to(`inbox:${ticket.user.toString()}`).emit('notification:new', { title: 'Ticket Refunded', message: ticket.event.title });

  res.json({ success: true, message: 'Ticket refunded successfully.', ticket });
});

// @desc  List everyone who booked a given event — organizer's attendee roster.
// @route GET /api/events/:eventId/attendees
const eventAttendees = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  const attendees = await Ticket.find({ event: event._id })
    .populate('user', 'name email phone')
    .populate('ticketType', 'name price')
    .sort({ createdAt: -1 });

  res.json({ success: true, event: { _id: event._id, title: event.title, slug: event.slug }, attendees });
});

// @desc  Branded PDF report of everyone checked in at the door for a given event — the
//        thing an organizer hands to a client or files away after the event wraps.
//        Pulled fresh from the database (not from any one scanner's local session), so
//        it's accurate even when several staff checked people in on different phones.
// @route GET /api/events/:eventId/check-in-report
const checkInReport = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId).populate('venue', 'name city address');
  if (!event) {
    res.status(404);
    throw new Error('Event not found.');
  }
  if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized.');
  }

  const allTickets = await Ticket.find({ event: event._id, status: { $ne: 'cancelled' } });
  const checkedIn = await Ticket.find({ event: event._id, status: 'checked-in' })
    .populate('user', 'name email')
    .populate('ticketType', 'name')
    .sort({ checkedInAt: 1 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="vibecrafters-checkin-${event.slug}.pdf"`);

  const PAGE_WIDTH = 612; // US Letter
  const MARGIN = 40;
  const TABLE_TOP_FIRST_PAGE = 250;
  const TABLE_TOP_OTHER_PAGES = 130;
  const ROW_HEIGHT = 24;
  const BOTTOM_LIMIT = 740;

  const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
  doc.pipe(res);

  // ---- Page 1 header: full brand banner + event details + summary ----
  drawBrandHeader(doc, { width: PAGE_WIDTH, height: 96 });

  doc.fillColor(BRAND.ink).font('Helvetica-Bold').fontSize(20).text(event.title, MARGIN, 118, { width: PAGE_WIDTH - MARGIN * 2 });

  const eventDate = new Date(event.startDt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const venueLine = event.venue ? `${event.venue.name} · ${event.venue.city}` : 'Venue not set';

  doc.font('Helvetica').fontSize(10.5).fillColor(BRAND.muted).text(`${eventDate}  ·  ${venueLine}`, MARGIN, 148);

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(BRAND.magenta)
    .text('CHECK-IN REPORT', MARGIN, 172, { characterSpacing: 1 });

  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(BRAND.ink)
    .text(
      `${checkedIn.length} of ${allTickets.length} ticket${allTickets.length === 1 ? '' : 's'} checked in  ·  Generated ${new Date().toLocaleString(
        'en-US',
        { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      )}`,
      MARGIN,
      188
    );

  doc.moveTo(MARGIN, 216).lineTo(PAGE_WIDTH - MARGIN, 216).strokeColor('#E3E3E3').stroke();

  // ---- Table (re-drawn on each new page if the list overflows) ----
  const columns = [
    { label: '#', x: MARGIN, width: 26 },
    { label: 'Name', x: MARGIN + 26, width: 150 },
    { label: 'Email', x: MARGIN + 176, width: 180 },
    { label: 'Ticket tier', x: MARGIN + 356, width: 100 },
    { label: 'Checked in at', x: MARGIN + 456, width: PAGE_WIDTH - MARGIN - (MARGIN + 456) },
  ];

  const drawTableHeader = (y) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.muted);
    columns.forEach((col) => doc.text(col.label.toUpperCase(), col.x, y, { width: col.width, characterSpacing: 0.4 }));
    doc.moveTo(MARGIN, y + 16).lineTo(PAGE_WIDTH - MARGIN, y + 16).strokeColor('#E3E3E3').stroke();
    return y + 28;
  };

  let y = drawTableHeader(TABLE_TOP_FIRST_PAGE);

  if (checkedIn.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor(BRAND.muted).text('No one has been checked in yet.', MARGIN, y);
  }

  checkedIn.forEach((ticket, i) => {
    if (y > BOTTOM_LIMIT) {
      doc.addPage({ size: 'LETTER', margin: 0 });
      doc.rect(0, 0, PAGE_WIDTH, 64).fill(BRAND.ink);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13).text('VibeCrafters — Check-in report (cont.)', MARGIN, 24);
      y = drawTableHeader(TABLE_TOP_OTHER_PAGES);
    }

    const checkedInTime = ticket.checkedInAt
      ? new Date(ticket.checkedInAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : '—';

    doc.font('Helvetica').fontSize(10).fillColor(BRAND.ink);
    doc.text(String(i + 1), columns[0].x, y, { width: columns[0].width });
    doc.text(ticket.user?.name || '—', columns[1].x, y, { width: columns[1].width });
    doc.fillColor(BRAND.muted).text(ticket.user?.email || '—', columns[2].x, y, { width: columns[2].width });
    doc.fillColor(BRAND.ink).text(ticket.ticketType?.name || '—', columns[3].x, y, { width: columns[3].width });
    doc.fillColor(BRAND.muted).text(checkedInTime, columns[4].x, y, { width: columns[4].width });

    y += ROW_HEIGHT;
  });

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#AAAAAA')
    .text('© VibeCrafters — Event Design & Curation', 0, 770, { align: 'center', width: PAGE_WIDTH });

  doc.end();
});

/** Brand colors and header are shared across every generated PDF — see utils/pdfBrand.js */

// @desc  Download a branded PDF ticket/receipt for a single ticket.
// @route GET /api/tickets/:id/receipt
const downloadReceipt = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('event')
    .populate('ticketType', 'name price')
    .populate('user', 'name email');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found.');
  }

  const isOwner = String(ticket.user._id) === String(req.user._id);
  const isEventOrganizer = String(ticket.event.organizer) === String(req.user._id);
  if (!isOwner && !isEventOrganizer && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to download this ticket.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="vibecrafters-ticket-${ticket.code}.pdf"`);

  const doc = new PDFDocument({ size: [400, 640], margin: 0 });
  doc.pipe(res);

  drawBrandHeader(doc);

  doc
    .fillColor(BRAND.ink)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(ticket.event.title, 24, 118, { width: 352 });

  const eventDate = new Date(ticket.event.startDt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let y = 158;
  const row = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.muted).text(label.toUpperCase(), 24, y, { characterSpacing: 0.5 });
    doc.font('Helvetica').fontSize(11).fillColor(BRAND.ink).text(value, 24, y + 13, { width: 352 });
    y += 42;
  };

  row('Date & time', eventDate);
  row('Ticket holder', ticket.user.name);
  row('Ticket tier', `${ticket.ticketType.name}${ticket.promoCodeUsed ? `  ·  Promo: ${ticket.promoCodeUsed}` : ''}`);
  row('Amount paid', ticket.priceAtPurchase > 0 ? `₹${ticket.priceAtPurchase.toLocaleString('en-IN')}` : 'Free');
  row('Ticket code', ticket.code);
  row('Status', ticket.status[0].toUpperCase() + ticket.status.slice(1));

  // Perforated divider, like a real ticket stub
  doc.dash(3, { space: 4 }).moveTo(24, y + 4).lineTo(376, y + 4).strokeColor('#D8D8D8').stroke();
  doc.undash();

  if (ticket.qrDataUrl) {
    const base64 = ticket.qrDataUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64, 'base64');
    doc.image(imgBuffer, 130, y + 24, { width: 140, height: 140 });
  }

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text('Show this QR code at check-in', 0, y + 176, { align: 'center', width: 400 });

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#AAAAAA')
    .text('© VibeCrafters — Event Design & Curation', 0, 615, { align: 'center', width: 400 });

  doc.end();
});

// @desc Verify Stripe payment
// @route POST /api/tickets/verify-payment
const verifyPayment = asyncHandler(async (req, res) => {
  const { session_id, paymentId } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  if (payment.status === 'paid') {
    const tickets = await Ticket.find({ _id: { $in: payment.tickets } });
    const event = tickets.length > 0 ? await Event.findById(tickets[0].event) : null;
    return res.json({ success: true, tickets, payment, event, totalAmount: payment.amount });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe key not configured');
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== 'paid') {
    res.status(400);
    throw new Error('Payment not completed');
  }

  payment.status = 'paid';
  payment.gatewayPaymentId = session.payment_intent;
  await payment.save();

  const tickets = await Ticket.find({ _id: { $in: payment.tickets } });
  if (tickets.length === 0) {
    res.status(404);
    throw new Error('Tickets not found for this payment');
  }
  const event = await Event.findById(tickets[0].event);

  for (const t of tickets) {
    t.status = 'booked';
    t.qrDataUrl = await generateTicketQR(t._id, t.event, t.code);
    await t.save();
  }

  sendBookingConfirmationEmail(req.user, event, payment).catch((e) =>
    console.error('Booking confirmation email failed:', e.message)
  );

  if (req.user.phone) {
    sendSMS(req.user.phone, `VibeCrafters: Your payment for ${event.title} is confirmed! You can find your tickets in the My Tickets section.`).catch(() => {});
  }

  pushNotification({
    userId: req.user._id,
    title: 'Booking confirmed 🎉',
    message: `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} for ${event.title} — ready in My Tickets.`,
  }).catch(() => {});

  if (event.organizer) {
    pushNotification({
      userId: event.organizer,
      title: 'New Booking 🎉',
      message: `${req.user.name} just booked ${tickets.length} ticket${tickets.length > 1 ? 's' : ''} for ${event.title}.`,
    }).catch(() => {});
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`inbox:${req.user._id.toString()}`).emit('notification:new', { title: 'Booking confirmed 🎉', message: event.title });
    if (event.organizer) {
      io.to(`inbox:${event.organizer.toString()}`).emit('notification:new', { title: 'New Booking 🎉', message: event.title });
    }
  }

  res.json({ success: true, tickets, payment, event, totalAmount: payment.amount });
});

module.exports = {
  addTicketType,
  listTicketTypes,
  updateTicketType,
  deleteTicketType,
  bookTickets,
  verifyPayment,
  myTickets,
  checkIn,
  cancelTicket,
  refundTicket,
  eventAttendees,
  checkInReport,
  downloadReceipt,
};
