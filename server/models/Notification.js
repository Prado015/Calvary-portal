// Audit trail of every SMS / email the system sends (or tried to send).
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  member:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // for digests sent to staff
  channel: { type: String, enum: ['sms', 'email'], required: true },
  kind:    { type: String, enum: ['followup', 'broadcast', 'birthday', 'digest', 'reminder'], default: 'broadcast' },
  to:      { type: String, default: '' },
  subject: { type: String, default: '' },
  message: { type: String, default: '' },
  status:  { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
  error:   { type: String, default: '' },
  sentBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

NotificationSchema.index({ member: 1, kind: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
