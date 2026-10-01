const express = require('express');
const router = express.Router();
const { createVenue, listVenues, checkAvailability, updateVenue, deleteVenue } = require('../controllers/venueController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', listVenues);
router.get('/:id/availability', checkAvailability);
router.post('/', protect, authorize('organizer', 'admin'), createVenue);
router.put('/:id', protect, authorize('organizer', 'admin'), updateVenue);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteVenue);

module.exports = router;
