const asyncHandler = require('express-async-handler');
const Contact = require('../models/Contact');
const { sendContactAcknowledgement } = require('../utils/email');

// @desc  Submit a contact form message (public)
// @route POST /api/contact
const submitContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400);
    throw new Error('Name, email and message are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address.');
  }
  if (message.length > 3000) {
    res.status(400);
    throw new Error('Message is too long (3000 characters max).');
  }

  const submission = await Contact.create({ name, email, subject, message });
  await sendContactAcknowledgement(submission).catch((e) => console.error('Contact ack email failed:', e.message));

  res.status(201).json({ success: true, message: "Thanks — we'll be in touch soon." });
});

// @desc  List contact submissions (admin)
// @route GET /api/contact
const listContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });
  res.json({ success: true, contacts });
});

module.exports = { submitContact, listContacts };
