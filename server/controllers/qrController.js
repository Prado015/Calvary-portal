const mongoose = require('mongoose');
const Member = require('../models/Member');
const Service = require('../models/Service');
const ServiceType = require('../models/ServiceType');
const MemberAttendance = require('../models/MemberAttendance');
const { canAccessDepartment } = require('../utils/access');
const { memberQrToken, verifyMemberQrToken } = require('../utils/signing');
const { isIsoDate, weekdayOf, todayUtc, addDays } = require('../utils/dates');

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const idStr = (v) => String(v && v._id ? v._id : v);

// GET /api/members/qr-cards?department=&cellgroup=[&all=true]
// Members with the signed QR value to print on their card. Inactive / other-church people are left out unless all=true.
exports.qrCards = async (req, res, next) => {
  try {
    let department = req.query.department || null;
    const { cellgroup } = req.query;
    if (req.user.department) {
      if (department && String(department) !== String(req.user.department)) return bad(res, 'Forbidden — you can only view your own ministry', 403);
      department = String(req.user.department);
    }
    if (!department && !cellgroup) return bad(res, 'Choose a ministry or a cellgroup first');
    for (const id of [department, cellgroup]) if (id && !mongoose.isValidObjectId(id)) return bad(res, 'Invalid id');

    const filter = {};
    if (department) filter.department = department;
    if (cellgroup) filter.cellgroup = cellgroup;
    if (req.query.all !== 'true') filter.status = { $nin: ['inactive', 'other_church'] };

    const members = await Member.find(filter).populate('department', 'name').populate('cellgroup', 'name').sort({ lastName: 1, firstName: 1 }).limit(400);
    res.json({
      success: true, count: members.length,
      data: members.map((m) => ({
        _id: m._id, memberId: m.memberId, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl || '',
        department: m.department ? m.department.name : '', cellgroup: m.cellgroup ? m.cellgroup.name : '',
        token: memberQrToken(m._id)
      }))
    });
  } catch (err) { next(err); }
};

async function findOrCreateWeekly(type, date, userId) {
  const key = { type: type._id, serviceDate: date, department: null };
  const existing = await Service.findOne(key);
  if (existing) return existing;
  try { return await Service.create({ ...key, name: type.name, createdBy: userId }); }
  catch (err) { if (err.code === 11000) return Service.findOne(key); throw err; }
}

// POST /api/member-attendance/qr-check-in   { token, typeId, date, status? }
// Scans a member card at the door. Marks the member present (or late) for that service and date.
exports.qrCheckIn = async (req, res, next) => {
  try {
    const { token, typeId, date } = req.body;
    const status = req.body.status === 'late' ? 'late' : 'present';

    const memberId = verifyMemberQrToken(token);
    if (!memberId) return bad(res, 'This QR code is not a valid Calvary member card');
    if (!mongoose.isValidObjectId(typeId)) return bad(res, 'Choose a service first');
    if (!isIsoDate(date)) return bad(res, 'Invalid date');
    if (date > addDays(todayUtc(), 2)) return bad(res, 'Attendance cannot be recorded for a future date');

    const member = await Member.findById(memberId).populate('department', 'name').populate('cellgroup', 'name');
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department._id)) return bad(res, 'This member belongs to another ministry', 403);

    const type = await ServiceType.findById(typeId);
    if (!type || !type.active) return bad(res, 'Unknown or switched-off service');
    if (type.kind !== 'weekly') return bad(res, `${type.name} dates are set per ministry — mark it on the Attendance Checker`);
    if (weekdayOf(date) !== type.weekday) return bad(res, `That date is not a ${type.name} day`);
    if (type.departments.length && !type.departments.some((d) => idStr(d) === idStr(member.department))) {
      return bad(res, `${type.name} does not apply to ${member.department.name}`);
    }

    const service = await findOrCreateWeekly(type, date, req.user._id);
    const existing = await MemberAttendance.findOne({ member: member._id, service: service._id });
    const summary = {
      _id: member._id, name: `${member.firstName} ${member.lastName}`, photoUrl: member.photoUrl || '',
      cellgroup: member.cellgroup ? member.cellgroup.name : '', department: member.department.name, status: member.status
    };

    if (existing && ['present', 'late'].includes(existing.status)) {
      return res.json({ success: true, already: true, member: summary, checkedInAt: existing.checkedInAt, status: existing.status });
    }

    const record = await MemberAttendance.findOneAndUpdate(
      { member: member._id, service: service._id },
      { $set: { status, date, source: 'qr', checkedInAt: new Date(), checkedInBy: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    req.io?.emit('member-checkin', record);
    res.json({ success: true, already: false, member: summary, checkedInAt: record.checkedInAt, status: record.status });
  } catch (err) { next(err); }
};
