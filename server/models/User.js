const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff', 'viewer'],
    default: 'usher'
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Which ministry this account belongs to. null = ushering/admin, unscoped.
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }
}, { timestamps: true });

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
