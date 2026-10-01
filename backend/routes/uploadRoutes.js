const express = require('express');
const router = express.Router();
const { upload } = require('../utils/upload');
const { protect } = require('../middleware/auth');

router.post('/', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an image' });
  }
  res.status(200).json({ success: true, url: req.file.path });
});

module.exports = router;
