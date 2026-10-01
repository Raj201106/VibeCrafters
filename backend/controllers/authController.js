const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendEmail, sendWelcomeEmail } = require('../utils/email');

// @desc  Register a new user
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address.');
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('An account with this email already exists.');
  }

  // Only allow self-signup as organizer/vendor/attendee — admin is provisioned manually
  const allowedRole = ['organizer', 'vendor', 'attendee'].includes(role) ? role : 'attendee';

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: password,
    role: allowedRole,
    phone,
  });

  generateToken(res, user._id);
  sendWelcomeEmail(user).catch((e) => console.error('Welcome email failed:', e.message));
  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// @desc  Login
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated.');
  }

  generateToken(res, user._id);
  res.json({ success: true, user: user.toSafeObject() });
});

// @desc  Logout
// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(process.env.COOKIE_NAME || 'vc_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Logged out.' });
});

// @desc  Get current logged-in user
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc  Update profile (name, phone, avatar)
// @route PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl } = req.body;
  if (name) req.user.name = name;
  if (phone) req.user.phone = phone;
  if (avatarUrl) req.user.avatarUrl = avatarUrl;
  await req.user.save();
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc  Change password while logged in (verifies current password — distinct from the
//        OTP-based forgotPassword/resetPassword flow used when you're locked out).
// @route PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters.');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user.passwordHash) {
    res.status(400);
    throw new Error('This account signed up with Google and has no password to change.');
  }
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect.');
  }

  user.passwordHash = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

// @desc  Request password reset OTP
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  // Always respond success to avoid leaking which emails are registered
  if (!user) return res.json({ success: true, message: 'If that email exists, an OTP was sent.' });

  const otp = String(crypto.randomInt(100000, 999999));
  user.resetOtp = otp;
  user.resetOtpExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'VibeCrafters — Password Reset OTP',
    html: `<p>Your password reset code is <b>${otp}</b>. It expires in 15 minutes.</p>`,
  });

  res.json({ success: true, message: 'If that email exists, an OTP was sent.' });
});

// @desc  Reset password using OTP
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters.');
  }
  const user = await User.findOne({
    email: email?.toLowerCase(),
    resetOtp: otp,
    resetOtpExpires: { $gt: Date.now() },
  }).select('+resetOtp +resetOtpExpires');

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired OTP.');
  }

  user.passwordHash = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
});

module.exports = { register, login, logout, getMe, updateProfile, changePassword, forgotPassword, resetPassword };
