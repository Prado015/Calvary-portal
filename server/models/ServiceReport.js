const mongoose = require('mongoose');

const ServiceReportSchema = new mongoose.Schema({
  service:      { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  attendance:   { type: Number, default: 0 },
  visitors:     { type: Number, default: 0 },
  offering:     { type: Number, default: 0 },
  notes:        { type: String, default: '' },
  submittedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('ServiceReport', ServiceReportSchema);
