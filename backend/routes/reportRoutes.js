const express = require('express');
const router = express.Router();
const { overview, salesTrend, eventReport, submitFeedback, getMyFeedback, recentOrders } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/overview', protect, authorize('admin', 'organizer'), overview);
router.get('/recent-orders', protect, authorize('admin', 'organizer'), recentOrders);
router.get('/sales-trend', protect, authorize('admin', 'organizer'), salesTrend);
router.get('/events/:eventId', protect, authorize('admin', 'organizer'), eventReport);
router.post('/feedback', protect, authorize('attendee'), submitFeedback);
router.get('/feedback/:eventId', protect, authorize('attendee'), getMyFeedback);

module.exports = router;
