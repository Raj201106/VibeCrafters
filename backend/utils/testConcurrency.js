/**
 * Concurrency test for the atomic ticket-booking fix in ticketController.bookTickets.
 *
 * WHY THIS EXISTS: the naive version of bookTickets read `available`, checked it, then wrote
 * `quantitySold` in a separate step. Two simultaneous requests for the last ticket could both
 * pass the check before either write landed, overselling the tier. The fix replaces that with
 * a single atomic `findOneAndUpdate` guarded by `$expr`. This script proves it under real
 * concurrent load against your actual MongoDB — not a mock — which is the only way to actually
 * verify a database-level atomicity claim.
 *
 * USAGE:
 *   1. Make sure MongoDB is running and backend/.env has a valid MONGO_URI
 *   2. From the backend/ folder: node utils/testConcurrency.js
 *
 * WHAT TO EXPECT: a ticket tier is created with exactly 5 seats. 20 "bookings" of 1 seat each
 * fire at the same instant. Exactly 5 should succeed and 15 should be rejected with "not enough
 * tickets left" — never more than 5 successes, no matter how many requests race for the seats.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const TicketType = require('../models/TicketType');
const Event = require('../models/Event');
const User = require('../models/User');

const SEATS = 5;
const CONCURRENT_REQUESTS = 20;

/** The exact atomic operation used in bookTickets — isolated here for direct testing. */
async function attemptReserve(ticketTypeId, quantity) {
  const result = await TicketType.findOneAndUpdate(
    { _id: ticketTypeId, $expr: { $gte: [{ $subtract: ['$quantity', '$quantitySold'] }, quantity] } },
    { $inc: { quantitySold: quantity } },
    { new: true }
  );
  return Boolean(result);
}

const run = async () => {
  await connectDB();
  console.log(`\nSetting up: 1 ticket tier with exactly ${SEATS} seats...`);

  const organizer = await User.create({
    name: 'Concurrency Test Organizer',
    email: `concurrency-test-${Date.now()}@example.com`,
    passwordHash: 'TestPassword123',
    role: 'organizer',
  });
  const event = await Event.create({
    title: 'Concurrency Test Event',
    description: 'temporary — safe to delete',
    startDt: new Date(Date.now() + 86400000),
    endDt: new Date(Date.now() + 90000000),
    organizer: organizer._id,
    status: 'draft',
  });
  const ticketType = await TicketType.create({
    event: event._id,
    name: 'Test Tier',
    price: 100,
    quantity: SEATS,
    quantitySold: 0,
  });

  console.log(`Firing ${CONCURRENT_REQUESTS} simultaneous booking attempts for ${SEATS} seats...\n`);

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, () => attemptReserve(ticketType._id, 1))
  );

  const succeeded = results.filter(Boolean).length;
  const rejected = results.length - succeeded;

  const final = await TicketType.findById(ticketType._id);

  console.log(`Succeeded: ${succeeded}`);
  console.log(`Rejected:  ${rejected}`);
  console.log(`Final quantitySold in DB: ${final.quantitySold} (must equal ${SEATS}, never more)\n`);

  if (succeeded === SEATS && final.quantitySold === SEATS) {
    console.log('✅ PASS — exactly the right number of seats were sold, no overselling under concurrent load.');
  } else {
    console.log('❌ FAIL — inventory was oversold or undersold. This would need investigating.');
  }

  // Clean up test data
  await TicketType.deleteOne({ _id: ticketType._id });
  await Event.deleteOne({ _id: event._id });
  await User.deleteOne({ _id: organizer._id });

  await mongoose.disconnect();
  process.exit(succeeded === SEATS ? 0 : 1);
};

run().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});
