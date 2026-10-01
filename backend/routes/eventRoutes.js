const express = require('express');
const router = express.Router();
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  updateStatus,
  deleteEvent,
} = require('../controllers/eventController');
const { addTicketType, listTicketTypes, updateTicketType, deleteTicketType, eventAttendees, checkInReport } = require('../controllers/ticketController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public listing, but optionalAuth attaches req.user when logged in so ?mine=true
// (used by the organizer dashboard) can actually filter by the current user's own events,
// including drafts that wouldn't otherwise be visible to the public.
router.get('/', optionalAuth, listEvents);
router.get('/:slug', optionalAuth, getEvent);

router.post('/', protect, authorize('organizer', 'admin'), createEvent);
router.put('/:id', protect, authorize('organizer', 'admin'), updateEvent);
router.patch('/:id/status', protect, authorize('organizer', 'admin'), updateStatus);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteEvent);

router.post('/:eventId/ticket-types', protect, authorize('organizer', 'admin'), addTicketType);
router.get('/:eventId/ticket-types', listTicketTypes);
router.put('/:eventId/ticket-types/:id', protect, authorize('organizer', 'admin'), updateTicketType);
router.delete('/:eventId/ticket-types/:id', protect, authorize('organizer', 'admin'), deleteTicketType);
router.get('/:eventId/attendees', protect, authorize('organizer', 'admin'), eventAttendees);
router.get('/:eventId/check-in-report', protect, authorize('organizer', 'admin'), checkInReport);

module.exports = router;
