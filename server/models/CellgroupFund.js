// Monthly "MTM Fund" submitted by a cell group (the Financials block of the
// monitoring report). One row per cellgroup + year + month.
const mongoose = require('mongoose');

const CellgroupFundSchema = new mongoose.Schema({
  cellgroup:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cellgroup', required: true },
  year:          { type: Number, required: true, min: 2000, max: 2100 },
  month:         { type: Number, required: true, min: 1, max: 12 },
  amount:        { type: Number, min: 0, default: 0 },
  dateSubmitted: { type: String, default: '' }, // YYYY-MM-DD or empty
  remarks:       { type: String, default: '', maxlength: 500 },
  recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

CellgroupFundSchema.index({ cellgroup: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('CellgroupFund', CellgroupFundSchema);
