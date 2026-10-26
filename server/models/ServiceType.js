// A kind of gathering members are marked against.
//  - weekly: happens every <weekday> (Sunday Service, Wednesday Service, Youth Friday Service)
//  - custom: dates are set by the ministry itself (Prayer Meeting for AMM / LM)
// `departments` limits who it applies to; empty = every ministry.
const mongoose = require('mongoose');

const COLORS = ['gold', 'teal', 'blue', 'purple', 'green', 'red'];

const ServiceTypeSchema = new mongoose.Schema({
  code:        { type: String, trim: true, lowercase: true },            // set for built-in defaults only
  name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 60, unique: true },
  kind:        { type: String, enum: ['weekly', 'custom'], default: 'weekly', required: true },
  weekday:     { type: Number, min: 0, max: 6, default: null },           // weekly only; 0 = Sunday
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  color:       { type: String, enum: COLORS, default: 'gold' },
  sortOrder:   { type: Number, default: 100 },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

ServiceTypeSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });

ServiceTypeSchema.pre('validate', function (next) {
  if (this.kind === 'weekly' && (this.weekday === null || this.weekday === undefined)) {
    this.invalidate('weekday', 'A weekly service needs a weekday');
  }
  if (this.kind === 'custom') this.weekday = null;
  next();
});

const Model = mongoose.model('ServiceType', ServiceTypeSchema);
Model.COLORS = COLORS;
module.exports = Model;
