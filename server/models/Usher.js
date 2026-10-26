const mongoose = require('mongoose');

const UsherSchema = new mongoose.Schema({
  usherCode:  { type: String, unique: true, sparse: true },
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  name:       { type: String },
  phone:      { type: String, trim: true },
  department: { type: String, trim: true }, // ushering sub-team label, free text (not the Department model)
  type:       { type: String, enum: ['Usher', 'Usherette', 'Head Usher'], default: 'Usher' },
  status:     { type: String, enum: ['Active', 'Inactive', 'Under Observation'], default: 'Active' },
  notes:      { type: String, default: '' },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

UsherSchema.pre('save', async function (next) {
  this.name = `${this.firstName} ${this.lastName}`;
  if (!this.usherCode) {
    const last = await mongoose.model('Usher').findOne({}, {}, { sort: { createdAt: -1 } });
    let num = 1;
    if (last?.usherCode) {
      const n = parseInt(last.usherCode.replace('USH', ''));
      if (!isNaN(n)) num = n + 1;
    }
    this.usherCode = `USH${String(num).padStart(4, '0')}`;
  }
  next();
});

UsherSchema.index({ status: 1 });
UsherSchema.index({ department: 1 });

module.exports = mongoose.model('Usher', UsherSchema);
