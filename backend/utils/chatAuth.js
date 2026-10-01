const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

/**
 * Confirms two users have a legitimate reason to chat about a given event — one must be the
 * event's organizer, and the other must hold an actual (non-cancelled) ticket to it. Shared
 * between the Socket.io handler and the REST history endpoint so both enforce the same rule.
 */
const canChat = async (eventId, userAId, userBId) => {
  const event = await Event.findById(eventId).select('organizer');
  if (!event) return false;

  const organizerId = String(event.organizer);
  const [a, b] = [String(userAId), String(userBId)];
  const organizerInPair = a === organizerId || b === organizerId;
  if (!organizerInPair) return false;

  const attendeeId = a === organizerId ? b : a;
  const hasTicket = await Ticket.exists({ event: eventId, user: attendeeId, status: { $ne: 'cancelled' } });
  return Boolean(hasTicket);
};

module.exports = { canChat };
