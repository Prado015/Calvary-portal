// A log of every time someone reached out to a member (call, text, visit...).
const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  method: { type: String, enum: ['call', 'sms', 'email', 'chat', 'visit', 'other'], default: 'call' },
  note:   { type: String, trim: true, maxlength: 500, default: '' },
  by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

FollowUpSchema.index({ member: 1, createdAt: -1 });

module.exports = mongoose.model('FollowUp', FollowUpSchema);
