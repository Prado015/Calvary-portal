const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('../utils/logger');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const shapeUser = (user) => ({
  id: user._id, firstName: user.firstName, lastName: user.lastName,
  email: user.email, role: user.role, position: user.position || '', status: user.status,
  department: user.department && user.department.slug
    ? { id: user.department._id, name: user.department.name, slug: user.department.slug }
    : null
});

const sendTokenResponse = (user, statusCode, res) => {
  res.status(statusCode).json({ success: true, token: signToken(user._id), user: shapeUser(user) });
};

// POST /api/auth/register — intentionally admin-only (see routes/auth.js)
exports.register = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { firstName, lastName, email, password, role, department } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, passwordHash, role, department: department || null });
    await log({ user: req.user, action: 'create', module: 'users', recordId: user._id, details: user.email });
    sendTokenResponse(await user.populate('department', 'name slug'), 201, res);
  } catch (err) { next(err); }
};

// Positions a person can pick when signing up. This is only a label shown to the admin.
// The account gets the lowest access (viewer) and stays 'pending' until a super admin
// approves it and chooses the real role.
const POSITIONS = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Leader', 'Assistant Leader', 'Pastor', 'Minister'];

// POST /api/auth/signup — public. Creates a PENDING account (no token, cannot log in until approved).
exports.signup = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const Department = require('../models/Department');
    const firstName = String(req.body.firstName || '').trim().slice(0, 60);
    const lastName  = String(req.body.lastName || '').trim().slice(0, 60);
    const email     = String(req.body.email || '').trim().toLowerCase();
    const password  = String(req.body.password || '');
    const position  = String(req.body.position || '');
    const departmentId = req.body.department || '';

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'First name, last name, email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (!POSITIONS.includes(position)) {
      return res.status(400).json({ success: false, message: 'Please choose your position' });
    }
    // A ministry portal is required: self-registered accounts are never back-office (unscoped) accounts.
    if (!departmentId) return res.status(400).json({ success: false, message: 'Please choose your portal' });
    const department = await Department.findOne({ _id: departmentId, active: true }).select('_id');
    if (!department) return res.status(400).json({ success: false, message: 'Please choose a valid ministry portal' });
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'This email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, passwordHash, role: 'viewer', position, department: department._id, status: 'pending' });
    await log({ user: null, action: 'create', module: 'users', recordId: user._id, details: `self-registration (pending): ${email} — ${position}` });
    res.status(201).json({ success: true, message: 'Request sent. An administrator will approve your account, then you can log in.' });
  } catch (err) { next(err); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+passwordHash').populate('department', 'name slug');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Only said after the password is right, so it does not reveal which emails exist.
    if (user.status === 'pending') return res.status(403).json({ success: false, message: 'Your account is waiting for admin approval.' });
    if (user.status !== 'active') return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await log({ user, action: 'login', module: 'auth' });
    sendTokenResponse(user, 200, res);
  } catch (err) { next(err); }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await req.user.populate('department', 'name slug');
    res.json({ success: true, user: shapeUser(user) });
  } catch (err) { next(err); }
};

// PUT /api/auth/password — any logged-in user changes their own password
exports.changePassword = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await log({ user, action: 'update', module: 'auth', details: 'password changed' });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};