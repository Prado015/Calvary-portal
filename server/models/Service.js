// One occurrence of a ServiceType on a date. Weekly occurrences are created the
// first time attendance is saved for them; custom ones (e.g. a Prayer Meeting)
// are created when a ministry sets the date.
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true }, // e.g. "Sunday Service"
  serviceDate: { type: String, required: true },             // YYYY-MM-DD
  startTime:   { type: String, default: '' },
  endTime:     { type: String, default: '' },
  type:        { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' },     // absent on older records
  department:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, // set for ministry-specific meetings
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

ServiceSchema.index({ serviceDate: -1 });
// One occurrence per type + date + ministry. Partial so older untyped services are unaffected.
ServiceSchema.index(
  { type: 1, serviceDate: 1, department: 1 },
  { unique: true, partialFilterExpression: { type: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Service', ServiceSchema);
