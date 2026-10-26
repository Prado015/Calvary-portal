// One row of the Cell Group Monitoring Report's activity log: what the group
// did, how many attended, who was absent, and the leader's assessment.
const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'Sunday Service', 'Youth Service', 'Cell Group Meeting', 'Acquaintance',
  'District Youth Conference', 'Sectional Youth Conference', 'Cell Group Outing',
  'Prayer Meeting', 'Other'
];

const CellgroupActivitySchema = new mongoose.Schema({
  cellgroup:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cellgroup', required: true },
  date:          { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
  type:          { type: String, enum: ACTIVITY_TYPES, required: true },
  attendeeCount: { type: Number, min: 0, default: 0 },          // may include visitors
  absentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  remarks:       { type: String, default: '', maxlength: 2000 }, // remarks / assessment
  recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

CellgroupActivitySchema.index({ cellgroup: 1, date: -1 });

const Model = mongoose.model('CellgroupActivity', CellgroupActivitySchema);
Model.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports = Model;
