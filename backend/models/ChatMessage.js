const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

chatMessageSchema.index({ event: 1, sender: 1, recipient: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
