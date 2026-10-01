const cron = require('node-cron');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { sendEventReminderEmail } = require('./email');

/**
 * Runs every hour, looks for published events starting between 23–25 hours from now,
 * and emails every attendee holding a "booked" ticket for that event. A `reminderSentAt`
 * flag on the event prevents duplicate sends across runs.
 */
const runReminderSweep = async () => {
  const windowStart = new Date(Date.now() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(Date.now() + 25 * 60 * 60 * 1000);

  const events = await Event.find({
    status: 'published',
    startDt: { $gte: windowStart, $lte: windowEnd },
    reminderSentAt: { $exists: false },
  });

  for (const event of events) {
    const tickets = await Ticket.find({ event: event._id, status: 'booked' }).populate('user', 'name email');
    const seen = new Set();
    for (const ticket of tickets) {
      if (!ticket.user || seen.has(String(ticket.user._id))) continue;
      seen.add(String(ticket.user._id));
      await sendEventReminderEmail(ticket.user, event).catch((e) =>
        console.error('Reminder email failed:', e.message)
      );
    }
    event.reminderSentAt = new Date();
    await event.save();
  }

  if (events.length) console.log(`⏰ Sent reminders for ${events.length} upcoming event(s).`);
};

const startReminderCron = () => {
  // Every hour, on the hour
  cron.schedule('0 * * * *', () => {
    runReminderSweep().catch((e) => console.error('Reminder sweep failed:', e.message));
  });
  console.log('⏰ Event reminder cron scheduled (hourly).');
};

module.exports = { startReminderCron, runReminderSweep };
