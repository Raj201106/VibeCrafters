const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Verifies JWT from httpOnly cookie (or Authorization header as fallback) and attaches req.user
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[process.env.COOKIE_NAME || 'vc_token'];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('User no longer exists or is deactivated.');
    }
    
    // Ensure the token version matches the user's current token version.
    // If not, it means they logged in from another device and this session is invalidated.
    const currentVersion = user.tokenVersion || 0;
    const tokenVersion = decoded.version || 0;
    
    if (tokenVersion !== currentVersion) {
      res.status(401);
      throw new Error('Session expired. You logged in from another device.');
    }
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired session.');
  }
});

// Role-based access control middleware factory
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Access denied. Requires role: ${roles.join(' or ')}.`);
    }
    next();
  };

// Like `protect`, but never blocks the request — just attaches req.user if a valid
// session cookie is present, and silently continues (as a guest) if not. Used on routes
// that behave differently for logged-in users (e.g. "show my drafts too") without requiring
// login for everyone else.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[process.env.COOKIE_NAME || 'vc_token'];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    const currentVersion = user?.tokenVersion || 0;
    const tokenVersion = decoded.version || 0;

    if (user && user.isActive && tokenVersion === currentVersion) {
      req.user = user;
    }
  } catch (err) {
    // invalid/expired token — proceed as a guest rather than failing the request
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };
