const mongoose = require('mongoose');

const AttendanceCounterSchema = new mongoose.Schema({
  date:      { type: String, required: true, unique: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  members:   { type: Number, default: 0 },
  visitors:  { type: Number, default: 0 },
  children:  { type: Number, default: 0 },
  peak:      { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceCounter', AttendanceCounterSchema);
