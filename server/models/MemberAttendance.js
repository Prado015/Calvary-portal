// Member check-ins per service/date — separate from AttendanceSession, which
// tracks usher duty attendance. Powers the Attendance Checker screen.
const mongoose = require('mongoose');

const MemberAttendanceSchema = new mongoose.Schema({
  member:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  date:    { type: String, required: true }, // YYYY-MM-DD, denormalised for fast daily queries
  status:  { type: String, enum: ['present', 'late', 'absent', 'excused'], default: 'present' },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  source:      { type: String, enum: ['manual', 'qr', 'system'], default: 'manual' },
  note:        { type: String, default: '' }
}, { timestamps: true });

// One mark per member per service. (Used to be per member per date, which would
// block a member being marked at two services on the same day.)
MemberAttendanceSchema.index({ member: 1, service: 1 }, { unique: true });
MemberAttendanceSchema.index({ member: 1, date: 1 });
MemberAttendanceSchema.index({ service: 1, date: 1 });

module.exports = mongoose.model('MemberAttendance', MemberAttendanceSchema);
