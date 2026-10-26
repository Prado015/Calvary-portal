const Member = require('../models/Member');
const MemberAttendance = require('../models/MemberAttendance');
const Visitor = require('../models/Visitor');

// GET /api/reports/attendance?department=&from=YYYY-MM-DD&to=YYYY-MM-DD
// One row per service date: present/late/absent counts and attendance rate
// against the current member roster of the chosen department (or everyone).
exports.attendanceSummary = async (req, res, next) => {
  try {
    const { department, from, to } = req.query;
    const memberFilter = department ? { department } : {};
    const memberIds = (await Member.find(memberFilter, '_id')).map((m) => m._id);
    const totalMembers = memberIds.length;

    const match = { member: { $in: memberIds } };
    if (from || to) match.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    const rows = await MemberAttendance.aggregate([
      { $match: match },
      { $group: {
          _id: '$date',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
      } },
      { $sort: { _id: -1 } },
      { $limit: 120 }
    ]);

    const data = rows.map((r) => {
      const attended = r.present + r.late;
      return { date: r._id, present: r.present, late: r.late, absent: r.absent, excused: r.excused,
               totalMembers, rate: totalMembers ? Math.round((attended / totalMembers) * 100) : 0 };
    });

    const avgRate = data.length ? Math.round(data.reduce((a, r) => a + r.rate, 0) / data.length) : 0;
    const best = data.length ? data.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
    const lowest = data.length ? data.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;

    res.json({ success: true, data, summary: { totalMembers, services: data.length, avgRate, best, lowest } });
  } catch (err) { next(err); }
};

// GET /api/reports/members?department= — full (unpaginated) roster for CSV export
exports.membersExport = async (req, res, next) => {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    const members = await Member.find(filter).populate('department', 'name').populate('cellgroup', 'name').sort({ lastName: 1 }).limit(5000);
    res.json({ success: true, count: members.length, data: members });
  } catch (err) { next(err); }
};

// GET /api/reports/visitors?department=&from=&to=
exports.visitorsExport = async (req, res, next) => {
  try {
    const { department, from, to } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    const visitors = await Visitor.find(filter).populate('cellgroup', 'name').sort({ date: -1 }).limit(5000);
    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (err) { next(err); }
};
