const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const generateToken = require('../utils/generateToken');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// --- Google OAuth (stateless: JWT issued directly in the callback, no server session) ---
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured on this server yet.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }),
  async (req, res) => {
    // Increment tokenVersion on every login to invalidate old sessions on other devices
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    
    generateToken(res, req.user._id, req.user.tokenVersion);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
  }
);

module.exports = router;

