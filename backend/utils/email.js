const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const BRAND = {
  ink: '#0F2A3D',
  magenta: '#C81E6E',
  ember: '#F5811F',
  cream: '#FBF7EF',
};

/** Escapes HTML-significant characters before interpolating user-supplied text into an email
 *  template — the contact form's name/message fields are public, untrusted input. */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Shared HTML shell so every email looks unmistakably like VibeCrafters. */
const wrap = (title, bodyHtml, ctaLabel, ctaUrl) => `
<div style="background:${BRAND.cream};padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #0F2A3D14;">
    <div style="background:linear-gradient(120deg, ${BRAND.magenta}, ${BRAND.ember});padding:22px 28px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">VibeCrafters</span>
    </div>
    <div style="padding:28px;color:${BRAND.ink};">
      <h1 style="font-size:20px;margin:0 0 12px;color:${BRAND.ink};">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#334;">${bodyHtml}</div>
      ${
        ctaUrl
          ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:22px;padding:12px 26px;border-radius:999px;background:linear-gradient(120deg, ${BRAND.magenta}, ${BRAND.ember});color:#fff;text-decoration:none;font-weight:600;font-size:14px;">${ctaLabel}</a>`
          : ''
      }
    </div>
    <div style="padding:16px 28px;border-top:1px solid #0F2A3D0F;color:#0F2A3D80;font-size:11px;">
      © ${new Date().getFullYear()} VibeCrafters — Event Design &amp; Curation
    </div>
  </div>
</div>`;

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER) {
    console.log(`✉️  [DEV MODE] Email to ${to}: ${subject}`);
    return { simulated: true };
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'VibeCrafters <no-reply@vibecrafters.com>',
    to,
    subject,
    html,
  });
};

// ---- Templated sends used across the app ----

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `Welcome to VibeCrafters, ${escapeHtml(user.name.split(' ')[0])}! 🎉`,
    html: wrap(
      `Welcome aboard, ${escapeHtml(user.name.split(' ')[0])}!`,
      `Your account is ready. Explore curated events, book in a couple of taps, and get your tickets as QR codes — no printing, no lines.`,
      'Explore events',
      `${process.env.CLIENT_URL}/events`
    ),
  });

const sendBookingConfirmationEmail = (user, event, payment) =>
  sendEmail({
    to: user.email,
    subject: `You're confirmed for ${escapeHtml(event.title)} 🎟️`,
    html: wrap(
      'Booking confirmed',
      `Hi ${escapeHtml(user.name.split(' ')[0])}, your booking for <b>${escapeHtml(event.title)}</b> is confirmed.<br/>
       Invoice: ${escapeHtml(payment.invoiceNumber)}<br/>Amount paid: ${payment.amount > 0 ? `₹${payment.amount}` : 'Free'}<br/><br/>
       Your QR e-tickets are ready in your account under "My Tickets" — show them at the entrance for check-in.`,
      'View my tickets',
      `${process.env.CLIENT_URL}/my-tickets`
    ),
  });

const sendEventReminderEmail = (user, event) =>
  sendEmail({
    to: user.email,
    subject: `Reminder: ${escapeHtml(event.title)} is coming up soon`,
    html: wrap(
      "It's almost showtime",
      `Hi ${escapeHtml(user.name.split(' ')[0])}, just a friendly reminder that <b>${escapeHtml(event.title)}</b> starts on
       ${new Date(event.startDt).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
       Have your QR ticket ready for a smooth check-in.`,
      'View my tickets',
      `${process.env.CLIENT_URL}/my-tickets`
    ),
  });

const sendPromoEmail = (user, { subject, headline, message, ctaLabel, ctaUrl }) =>
  sendEmail({
    to: user.email,
    subject: subject || 'A special offer from VibeCrafters ✨',
    html: wrap(headline || "Something special, just for you", message, ctaLabel || "See what's on", ctaUrl || `${process.env.CLIENT_URL}/events`),
  });

const sendContactAcknowledgement = (submission) =>
  sendEmail({
    to: submission.email,
    subject: 'We received your message — VibeCrafters',
    html: wrap(
      `Thanks for reaching out, ${escapeHtml(submission.name.split(' ')[0])}`,
      `We've received your message and our team will get back to you within 1–2 business days.<br/><br/>
       <i>"${escapeHtml(submission.message.slice(0, 200))}${submission.message.length > 200 ? '…' : ''}"</i>`
    ),
  });

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendEventReminderEmail,
  sendPromoEmail,
  sendContactAcknowledgement,
};
