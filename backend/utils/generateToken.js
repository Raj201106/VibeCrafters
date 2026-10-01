const jwt = require('jsonwebtoken');

const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(process.env.COOKIE_NAME || 'vc_token', token, {
    httpOnly: true,
    // In production the frontend (Vercel) and backend (Render/Railway) live on different
    // domains, so the cookie must be sameSite:'none' + secure:true to be sent cross-site at
    // all. In local dev both run on localhost, where 'lax' + non-secure works over HTTP.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

module.exports = generateToken;

