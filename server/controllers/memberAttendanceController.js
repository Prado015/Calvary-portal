const MemberAttendance = require('../models/MemberAttendance');
const Member = require('../models/Member');
const Cellgroup = require('../models/Cellgroup');

// GET /api/member-attendance?service=&date=&department=&cellgroup=
exports.getAttendanceForService = async (req, res, next) => {
  try {
    const { service, date, department, cellgroup } = req.query;
    if (!service || !date) return res.status(400).json({ success: false, message: 'service and date are required' });

    const memberFilter = {};
    if (department) memberFilter.department = department;
    if (cellgroup)  memberFilter.cellgroup  = cellgroup;

    const members = await Member.find(memberFilter).populate('department', 'name slug').populate('cellgroup', 'name').sort({ lastName: 1 });
    const records = await MemberAttendance.find({ service, date, member: { $in: members.map(m => m._id) } });
    const recordByMember = new Map(records.map(r => [String(r.member), r]));

    res.json({ success: true, count: members.length, data: members.map(m => ({ member: m, attendance: recordByMember.get(String(m._id)) || null })) });
  } catch (err) { next(err); }
};

// POST /api/member-attendance/check-in
exports.checkIn = async (req, res, next) => {
  try {
    const { member, service, date, status = 'present', source = 'manual' } = req.body;
    if (!member || !service || !date) return res.status(400).json({ success: false, message: 'member, service, and date are required' });

    const record = await MemberAttendance.findOneAndUpdate(
      { member, service },
      { member, service, date, status, source, checkedInAt: new Date(), checkedInBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    req.io?.emit('member-checkin', record);
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

exports.getMemberHistory = async (req, res, next) => {
  try {
    const history = await MemberAttendance.find({ member: req.params.memberId }).sort({ date: -1 }).limit(50);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) { next(err); }
};

// GET /api/member-attendance/overview?department=&weeks=5
exports.getWeeklyOverview = async (req, res, next) => {
  try {
    const { department } = req.query;
    const weeks = parseInt(req.query.weeks) || 5;
    const memberFilter = {};
    if (department) memberFilter.department = department;
    const totalMembers = await Member.countDocuments(memberFilter);
    const memberIds = totalMembers ? (await Member.find(memberFilter, '_id')).map(m => m._id) : [];

    const rows = await MemberAttendance.aggregate([
      { $match: { member: { $in: memberIds }, status: { $in: ['present', 'late'] } } },
      { $group: { _id: '$date', present: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: weeks }
    ]);

    res.json({ success: true, data: rows.reverse().map(r => ({ date: r._id, present: r.present, rate: totalMembers ? Math.round((r.present / totalMembers) * 100) : 0 })) });
  } catch (err) { next(err); }
};

// GET /api/member-attendance/by-cellgroup?department=&date=[&service=]
// Members present on that date (any service, counted once each) per cellgroup.
exports.getCellgroupBreakdown = async (req, res, next) => {
  try {
    const { department, service, date } = req.query;
    if (!department || !date) return res.status(400).json({ success: false, message: 'department and date are required' });

    const cellgroups = await Cellgroup.find({ department, active: true }).sort({ name: 1 });
    const data = await Promise.all(cellgroups.map(async (cg) => {
      const members = await Member.find({ cellgroup: cg._id }, '_id');
      const memberIds = members.map(m => m._id);
      const match = { member: { $in: memberIds }, date, status: { $in: ['present', 'late'] } };
      if (service) match.service = service;
      const presentIds = await MemberAttendance.distinct('member', match);
      const present = presentIds.length;
      return { cellgroup: { id: cg._id, name: cg.name }, present, total: memberIds.length, rate: memberIds.length ? Math.round((present / memberIds.length) * 100) : 0 };
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
