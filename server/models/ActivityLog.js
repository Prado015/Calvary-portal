const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'System' },
  action:   { type: String, required: true }, // create | update | delete | login...
  module:   { type: String, required: true }, // members | departments | ushers...
  recordId: { type: mongoose.Schema.Types.ObjectId, default: null },
  details:  { type: String, default: '' }
}, { timestamps: true });

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ module: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
