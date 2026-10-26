const mongoose = require('mongoose');

const WaterBaptismSchema = new mongoose.Schema({
  baptismDate:         { type: String, required: true },
  firstName:           { type: String, required: true, trim: true },
  lastName:            { type: String, required: true, trim: true },
  age:                 { type: Number, default: null },
  address:             { type: String, default: '' },
  contactNumber:       { type: String, default: '' },
  officiatingMinister: { type: String, default: '' },
  remarks:             { type: String, default: '' },
  encodedBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

WaterBaptismSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
WaterBaptismSchema.index({ baptismDate: -1 });
WaterBaptismSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('WaterBaptism', WaterBaptismSchema);
