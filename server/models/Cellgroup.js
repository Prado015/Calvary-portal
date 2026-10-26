const mongoose = require('mongoose');

const CellgroupSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  leader:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Names as printed on the monitoring report; cell leaders don't need a login.
  leaderName:       { type: String, trim: true, default: '' },
  assistantLeaders: [{ type: String, trim: true }],
  active:     { type: Boolean, default: true }
}, { timestamps: true });

CellgroupSchema.index({ department: 1 });

module.exports = mongoose.model('Cellgroup', CellgroupSchema);
