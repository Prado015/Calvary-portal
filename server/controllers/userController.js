const bcrypt = require('bcryptjs');
const User = require('../models/User');
const mongoose = require('mongoose');
const Cellgroup = require('../models/Cellgroup');
const { log } = require('../utils/logger');

// GET /api/users — super admin: manage who can log in and to which portal
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().populate('department', 'name slug').populate('cellgroup', 'name').sort({ firstName: 1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { next(err); }
};

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, passwordHash, role: role || 'usher_secretary', department: department || null });
    await log({ user: req.user, action: 'create', module: 'users', recordId: user._id, details: user.email });
    res.status(201).json({ success: true, data: await user.populate('department', 'name slug') });
  } catch (err) { next(err); }
};

// PUT /api/users/:id — role / department / status / cellgroup lock (never the password here)
exports.updateUser = async (req, res, next) => {
  try {
    const { role, department, status, cellgroup } = req.body;
    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;
    if (department !== undefined) update.department = department || null;
    // Cellgroup lock: '' / null removes it; an id must be a cellgroup of the person's ministry.
    if (cellgroup !== undefined) {
      if (cellgroup) {
        const current = await User.findById(req.params.id, 'department');
        if (!current) return res.status(404).json({ success: false, message: 'User not found' });
        const deptId = department !== undefined ? department : current.department;
        const cg = deptId && mongoose.isValidObjectId(cellgroup) ? await Cellgroup.findOne({ _id: cellgroup, department: deptId }, '_id') : null;
        if (!cg) return res.status(400).json({ success: false, message: "That cellgroup does not belong to this person's ministry" });
        update.cellgroup = cg._id;
      } else update.cellgroup = null;
    } else if (department !== undefined) {
      update.cellgroup = null; // moved to another ministry: the old cellgroup no longer applies
    }
    if (String(req.params.id) === String(req.user._id) && (update.status === 'inactive' || (update.role && update.role !== 'super_admin'))) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate or demote your own account' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('department', 'name slug').populate('cellgroup', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await log({ user: req.user, action: 'update', module: 'users', recordId: user._id });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
