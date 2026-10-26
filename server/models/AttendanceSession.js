// Usher duty attendance per service — distinct from MemberAttendance.
const mongoose = require('mongoose');

const AttendanceSessionSchema = new mongoose.Schema({
  usherId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Usher', required: true },
  date:        { type: String, required: true },
  service:     { type: String, required: true },
  section:     { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  checkInTime: { type: Date, default: null },
  checkOutTime:{ type: Date, default: null },
  status:      { type: String, enum: ['checked_in', 'checked_out', 'absent', 'excused'], default: 'checked_in' },
  note:        { type: String, default: '' }
}, { timestamps: true });

AttendanceSessionSchema.index(
  { usherId: 1, date: 1, service: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['absent', 'excused'] } } }
);

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
