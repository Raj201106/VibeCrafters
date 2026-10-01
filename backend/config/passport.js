const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/email');

/**
 * Google OAuth is only wired up if credentials are present in .env — this lets the rest of the
 * app run fine in local/demo environments without a Google Cloud project configured yet.
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.authProvider = 'google';
              await user.save();
            }
            return done(null, user);
          }

          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            authProvider: 'google',
            avatarUrl: profile.photos?.[0]?.value || '',
            role: 'attendee',
          });

          sendWelcomeEmail(user).catch(() => {});
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
