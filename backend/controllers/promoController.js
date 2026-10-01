const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { sendPromoEmail } = require('../utils/email');
const { pushNotification } = require('./notificationController');

// @desc  Send a promotional/offer email blast to all attendees (or a specific list)
// @route POST /api/promotions/send
// @body { subject, headline, message, ctaLabel, ctaUrl, audience: 'all' | 'attendees', emails?: [] }
const sendPromotion = asyncHandler(async (req, res) => {
  const { subject, headline, message, ctaLabel, ctaUrl, audience = 'attendees', emails } = req.body;

  if (!message) {
    res.status(400);
    throw new Error('Message body is required.');
  }

  const filter = Array.isArray(emails) && emails.length
    ? { email: { $in: emails.map((e) => e.toLowerCase()) } }
    : audience === 'all'
    ? {}
    : { role: 'attendee' };

  const recipients = await User.find(filter).select('name email');

  let sent = 0;
  for (const user of recipients) {
    try {
      await sendPromoEmail(user, { subject, headline, message, ctaLabel, ctaUrl });
      await pushNotification({
        userId: user._id,
        type: 'push',
        title: headline || 'A special offer just for you',
        message: message.slice(0, 140),
      });
      sent++;
    } catch (e) {
      console.error(`Promo email failed for ${user.email}:`, e.message);
    }
  }

  res.json({ success: true, message: `Sent to ${sent} of ${recipients.length} recipients.` });
});

module.exports = { sendPromotion };
