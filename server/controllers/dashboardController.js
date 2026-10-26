const Usher             = require('../models/Usher');
const Visitor           = require('../models/Visitor');
const AttendanceSession = require('../models/AttendanceSession');
const ActivityLog       = require('../models/ActivityLog');

const today = () => new Date().toISOString().split('T')[0];

// GET /api/dashboard/stats — usher/admin back-office stats
exports.getStats = async (req, res, next) => {
  try {
    const [totalUshers, activeUshers, todayVisitors, todayCheckIns] = await Promise.all([
      Usher.countDocuments(),
      Usher.countDocuments({ status: 'Active' }),
      Visitor.countDocuments({ date: today() }),
      AttendanceSession.countDocuments({ date: today(), status: 'checked_in' })
    ]);
    res.json({ success: true, data: { totalUshers, activeUshers, todayVisitors, todayCheckIns } });
  } catch (err) { next(err); }
};

// GET /api/dashboard/activity?module=&limit=
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { module } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    const filter = {};
    if (module) filter.module = module;
    const activity = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ success: true, data: activity });
  } catch (err) { next(err); }
};
