const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('../utils/logger');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const shapeUser = (user) => ({
  id: user._id, firstName: user.firstName, lastName: user.lastName,
  email: user.email, role: user.role, status: user.status,
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

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+passwordHash').populate('department', 'name slug');
    if (!user || user.status !== 'active') return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

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
