// Ministry-level entity: Youth, Ladies Ministries, Adult Men Ministry, Children,
// Music Ministry, Sunday School, Prayer Ministry, Evangelism, Couples, Singles...
const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  leader:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  active:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);
