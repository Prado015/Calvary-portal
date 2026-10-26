const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized — no token' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Not authorized — invalid token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden — insufficient role' });
  }
  next();
};
