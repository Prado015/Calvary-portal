const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget activity log entry. Never throws — a logging failure
// should never break the actual request.
async function log({ user, action, module, recordId, details = '' }) {
  try {
    await ActivityLog.create({
      user: user?._id || null,
      userName: user ? `${user.firstName} ${user.lastName}` : 'System',
      action, module, recordId, details
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}

module.exports = { log };
