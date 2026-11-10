const MemberAttendance = require('../models/MemberAttendance');
const Member = require('../models/Member');
const Cellgroup = require('../models/Cellgroup');
const mongoose = require('mongoose');
const { memberScope, canAccessMember } = require('../utils/access');

// Loads a member and checks the signed-in user may touch them. Sends the error and returns null if not.
async function accessibleMember(req, res, id) {
  if (!mongoose.isValidObjectId(id)) { res.status(400).json({ success: false, message: 'Invalid member id' }); return null; }
  const m = await Member.findById(id, 'department cellgroup');
  if (!m) { res.status(404).json({ success: false, message: 'Member not found' }); return null; }
  if (!canAccessMember(req.user, m)) { res.status(403).json({ success: false, message: 'Forbidden — that member is outside your access' }); return null; }
  return m;
}

// GET /api/member-attendance?service=&date=&department=&cellgroup=
exports.getAttendanceForService = async (req, res, next) => {
  try {
    const { service, date, department, cellgroup } = req.query;
    if (!service || !date) return res.status(400).json({ success: false, message: 'service and date are required' });

    const memberFilter = {};
    if (department) memberFilter.department = department;
    if (cellgroup)  memberFilter.cellgroup  = cellgroup;
    Object.assign(memberFilter, memberScope(req.user));

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

    if (!(await accessibleMember(req, res, member))) return;
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
    if (!(await accessibleMember(req, res, req.params.memberId))) return;
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
    Object.assign(memberFilter, memberScope(req.user));
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

    const cgFilter = { department: req.user.department || department, active: true };
    if (req.user.cellgroup) cgFilter._id = req.user.cellgroup;   // locked leaders only see their own cellgroup
    const cellgroups = await Cellgroup.find(cgFilter).sort({ name: 1 });
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
