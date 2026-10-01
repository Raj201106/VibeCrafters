const express = require('express');
const router = express.Router();
const { createVendor, listVendors, approveVendor, updateVendor, reviewVendor, getVendorReviews } = require('../controllers/vendorController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, listVendors);
router.post('/', protect, authorize('vendor', 'admin'), createVendor);
router.put('/:id', protect, authorize('vendor', 'admin'), updateVendor);
router.patch('/:id/approve', protect, authorize('admin'), approveVendor);
router.get('/:id/reviews', getVendorReviews);
router.post('/:id/reviews', protect, authorize('organizer', 'admin'), reviewVendor);

module.exports = router;
