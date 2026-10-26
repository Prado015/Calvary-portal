const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  contact:       { type: String, trim: true, default: '' },
  date:          { type: String, required: true }, // YYYY-MM-DD
  firstTime:     { type: String, enum: ['yes', 'no'], default: 'yes' },
  prayerRequest: { type: String, default: '' },
  department:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  cellgroup:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cellgroup', default: null },
  assignedUsher: { type: mongoose.Schema.Types.ObjectId, ref: 'Usher', default: null },
  visitorNumber: { type: String, unique: true, sparse: true },
  registeredBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

VisitorSchema.pre('save', async function (next) {
  if (!this.visitorNumber) {
    const last = await mongoose.model('Visitor').findOne({}, {}, { sort: { createdAt: -1 } });
    let num = 1;
    if (last?.visitorNumber) {
      const n = parseInt(last.visitorNumber.replace('VIS-', ''));
      if (!isNaN(n)) num = n + 1;
    }
    this.visitorNumber = `VIS-${String(num).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Visitor', VisitorSchema);
