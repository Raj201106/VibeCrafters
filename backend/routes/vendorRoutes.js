const express = require('express');
const router = express.Router();
const { createVendor, listVendors, approveVendor, updateVendor, reviewVendor, getVendorReviews, inviteVendor, getMyGigInvitations, respondToGig, organizerRejectQuote, createQuotePaymentIntent, confirmQuotePayment } = require('../controllers/vendorController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.get('/gigs/my-invitations', protect, authorize('vendor'), getMyGigInvitations);
router.patch('/gigs/:bookingId/status', protect, authorize('vendor'), respondToGig);
router.patch('/gigs/:bookingId/reject', protect, authorize('organizer', 'admin'), organizerRejectQuote);
router.post('/gigs/:bookingId/pay', protect, authorize('organizer', 'admin'), createQuotePaymentIntent);
router.get('/gigs/:bookingId/verify-payment', protect, authorize('organizer', 'admin'), confirmQuotePayment);

router.get('/', optionalAuth, listVendors);
router.post('/', protect, authorize('vendor', 'admin'), createVendor);
router.put('/:id', protect, authorize('vendor', 'admin'), updateVendor);
router.post('/:id/invite', protect, authorize('organizer', 'admin'), inviteVendor);
router.patch('/:id/approve', protect, authorize('admin'), approveVendor);
router.get('/:id/reviews', getVendorReviews);
router.post('/:id/reviews', protect, authorize('organizer', 'admin'), reviewVendor);

module.exports = router;
