// The core ministry-management entity — distinct from Usher (ushering staff)
// and User (login account). A person can be a Member without being either.
const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  memberId:   { type: String, unique: true, sparse: true }, // auto: MEM-00012
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  middleInitial: { type: String, trim: true, default: '' },
  contact:    { type: String, trim: true, default: '' },
  email:      { type: String, trim: true, lowercase: true, default: '' },
  gender:     { type: String, enum: ['Male', 'Female', ''], default: '' },
  age:        { type: Number, min: 0, max: 120, default: null },
  birthdate:  { type: Date, default: null },
  location:   { type: String, trim: true, default: '' },
  // Student -> level (e.g. "Grade 11"); Working -> position and/or company
  occupationType:   { type: String, enum: ['', 'student', 'working'], default: '' },
  occupationDetail: { type: String, trim: true, default: '' },
  ministries: [{ type: String, trim: true }], // empty = "None"

  photoUrl:   { type: String, default: '' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  cellgroup:  { type: mongoose.Schema.Types.ObjectId, ref: 'Cellgroup', default: null },
  // Role inside the cellgroup, as written in the masterlist's "CG Position" column.
  cgPosition: { type: String, enum: ['', 'Leader', 'Assistant Leader', 'Secretary', 'Member'], default: '' },
  // Children's ministry only (Toddlers 1/2, Beginners 1/2, Primary, Junior).
  ageGroup:   { type: String, trim: true, default: '' },
  // Masterlist flags
  profilingForm:       { type: Boolean, default: false }, // "With Profiling Form"
  baptizedWater:       { type: Boolean, default: false },
  baptizedHolyGhost:   { type: Boolean, default: false },
  // Matches the sheet's status column: blank = active, Sunday Goer, Bible Study,
  // Inactive, Other Church.
  status:     { type: String, enum: ['active', 'sunday_goer', 'bible_study', 'needs_followup', 'inactive', 'other_church'], default: 'active' },
  dateJoined: { type: Date, default: Date.now },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

MemberSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });

MemberSchema.index({ department: 1 });
MemberSchema.index({ cellgroup: 1 });
MemberSchema.index({ status: 1 });

MemberSchema.pre('save', async function (next) {
  if (!this.memberId) {
    const last = await mongoose.model('Member').findOne({}, {}, { sort: { createdAt: -1 } });
    let num = 1;
    if (last?.memberId) {
      const n = parseInt(last.memberId.replace('MEM-', ''));
      if (!isNaN(n)) num = n + 1;
    }
    this.memberId = `MEM-${String(num).padStart(5, '0')}`;
  }
  next();
});

MemberSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Member', MemberSchema);