// Usher seating/assignment zones (Main Entrance Greeter, Guiding Usher,
// Assembling Chairs, etc.) — NOT a ministry department.
const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  sectionName: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
