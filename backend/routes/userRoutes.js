const express = require('express');
const router = express.Router();
const { listUsers, setUserActive } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), listUsers);
router.patch('/:id/status', protect, authorize('admin'), setUserActive);

module.exports = router;
