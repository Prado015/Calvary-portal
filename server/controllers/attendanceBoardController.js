// Attendance board: the monthly "Service Attendance" grid and the "Individual
// Attendance" view, plus saving marks and managing ministry-set meeting dates.
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Service = require('../models/Service');
const ServiceType = require('../models/ServiceType');
const Department = require('../models/Department');
const MemberAttendance = require('../models/MemberAttendance');
const { canAccessDepartment } = require('../utils/access');
const { log } = require('../utils/logger');
const { isIsoDate, weekdayOf, monthDates, monthRange, todayUtc, addDays, sameDayInMonthOffset } = require('../utils/dates');

const STATUSES = ['present', 'late', 'absent', 'excused'];
const MAX_MEMBERS = 1500;
const MAX_MARKS_PER_SAVE = 10000;

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idStr = (v) => String(v && v._id ? v._id : v);

// A user with a department can only work inside it. Returns { dept } or sends an error.
function resolveScope(req, res, requested) {
  const own = req.user.department ? String(req.user.department) : null;
  if (own) {
    if (requested && String(requested) !== own) { bad(res, 'Forbidden — you can only view your own ministry', 403); return null; }
    return { dept: own };
  }
  if (requested && !mongoose.isValidObjectId(requested)) { bad(res, 'Invalid department id'); return null; }
  return { dept: requested || null };
}

function parseYearMonth(q) {
  const now = new Date();
  let year = parseInt(q.year, 10);
  let month = parseInt(q.month, 10);
  if (!(year >= 2000 && year <= 2100)) year = now.getUTCFullYear();
  if (!(month >= 1 && month <= 12)) month = now.getUTCMonth() + 1;
  return { year, month };
}

const occKey = (typeId, date, deptId) => `${typeId}|${date}|${deptId || ''}`;
const typeAppliesTo = (type, deptId) => !deptId || type.departments.length === 0 || type.departments.some((d) => idStr(d) === String(deptId));

// Builds the list of columns (occurrences) for a month.
//  weekly types -> every matching weekday; custom types -> the dates a ministry has set.
function buildOccurrences(types, services, year, month, deptId) {
  const dates = monthDates(year, month);
  const svcByKey = new Map(services.map((s) => [occKey(idStr(s.type), s.serviceDate, s.department ? idStr(s.department) : ''), s]));
  const out = [];

  for (const t of types) {
    const base = { typeId: String(t._id), typeName: t.name, kind: t.kind, color: t.color, sortOrder: t.sortOrder };
    if (t.kind === 'weekly') {
      for (const d of dates) {
        if (weekdayOf(d) !== t.weekday) continue;
        const svc = svcByKey.get(occKey(t._id, d, ''));
        out.push({ ...base, key: occKey(t._id, d, ''), date: d, serviceId: svc ? String(svc._id) : null, department: null, departmentIds: t.departments.map(idStr) });
      }
    } else {
      for (const s of services) {
        if (idStr(s.type) !== String(t._id)) continue;
        const sDept = s.department ? idStr(s.department) : null;
        if (deptId && sDept && sDept !== String(deptId)) continue; // another ministry's meeting
        out.push({
          ...base, key: occKey(t._id, s.serviceDate, sDept || ''), date: s.serviceDate, serviceId: String(s._id),
          department: s.department && s.department.name ? { _id: idStr(s.department), name: s.department.name, slug: s.department.slug } : null,
          departmentIds: sDept ? [sDept] : t.departments.map(idStr)
        });
      }
    }
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.typeName.localeCompare(b.typeName) || a.date.localeCompare(b.date));
}

async function loadMonth(types, year, month, deptId) {
  const { from, to } = monthRange(year, month);
  const services = types.length
    ? await Service.find({ type: { $in: types.map((t) => t._id) }, serviceDate: { $gte: from, $lte: to } }).populate('department', 'name slug')
    : [];
  return { services, occurrences: buildOccurrences(types, services, year, month, deptId) };
}

async function visibleTypes(deptId) {
  const types = await ServiceType.find({ active: true }).sort({ sortOrder: 1, name: 1 });
  return types.filter((t) => typeAppliesTo(t, deptId));
}

// GET /api/attendance-board/month?year=&month=&department=&search=&includeInactive=
exports.getMonth = async (req, res, next) => {
  try {
    const scope = resolveScope(req, res, req.query.department);
    if (!scope) return;
    const { year, month } = parseYearMonth(req.query);

    const types = await visibleTypes(scope.dept);
    const { services, occurrences } = await loadMonth(types, year, month, scope.dept);

    const filter = {};
    if (scope.dept) filter.department = scope.dept;
    if (req.query.includeInactive !== 'true') filter.status = { $ne: 'inactive' };
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { memberId: re }];
    }
    const members = await Member.find(filter, 'memberId firstName lastName department cellgroup status')
      .populate('department', 'name slug').populate('cellgroup', 'name')
      .sort({ lastName: 1, firstName: 1 }).limit(MAX_MEMBERS);

    // marks[memberId][occurrenceKey] = status
    const keyByService = new Map(occurrences.filter((o) => o.serviceId).map((o) => [o.serviceId, o.key]));
    const marks = {};
    if (keyByService.size && members.length) {
      const records = await MemberAttendance.find(
        { service: { $in: [...keyByService.keys()] }, member: { $in: members.map((m) => m._id) } }, 'member service status');
      for (const r of records) {
        const k = keyByService.get(String(r.service));
        if (!k) continue;
        (marks[String(r.member)] = marks[String(r.member)] || {})[k] = r.status;
      }
    }

    const department = scope.dept ? await Department.findById(scope.dept, 'name slug') : null;
    res.json({
      success: true, year, month, today: todayUtc(), department,
      types: types.map((t) => ({ _id: t._id, name: t.name, kind: t.kind, color: t.color, departments: t.departments })),
      occurrences, members, marks, truncated: members.length >= MAX_MEMBERS
    });
  } catch (err) { next(err); }
};

// GET /api/attendance-board/member/:id?year=&month=
exports.getMemberMonth = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid member id');
    const member = await Member.findById(req.params.id).populate('department', 'name slug').populate('cellgroup', 'name');
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department._id)) return bad(res, 'Forbidden — this member belongs to another ministry', 403);
    const { year, month } = parseYearMonth(req.query);

    const types = await visibleTypes(member.department._id);
    const { occurrences } = await loadMonth(types, year, month, member.department._id);

    const keyByService = new Map(occurrences.filter((o) => o.serviceId).map((o) => [o.serviceId, o.key]));
    const marks = {};
    if (keyByService.size) {
      const records = await MemberAttendance.find({ member: member._id, service: { $in: [...keyByService.keys()] } }, 'service status');
      for (const r of records) marks[keyByService.get(String(r.service))] = r.status;
    }

    const today = todayUtc();
    const held = occurrences.filter((o) => o.date <= today);
    const present = held.filter((o) => ['present', 'late'].includes(marks[o.key])).length;
    const last = await MemberAttendance.findOne({ member: member._id, status: { $in: ['present', 'late'] } }).sort({ date: -1 });

    res.json({
      success: true, year, month, today, member, occurrences, marks,
      summary: { held: held.length, present, rate: held.length ? Math.round((present / held.length) * 100) : 0, lastAttended: last ? last.date : null }
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

// PUT /api/attendance-board/save
// { occurrences: [ { typeId, date, serviceId?, marks: [ { member, status|null } ] } ] }
// status null/'' clears the mark. Only changed cells need to be sent.
exports.save = async (req, res, next) => {
  try {
    const list = Array.isArray(req.body.occurrences) ? req.body.occurrences : null;
    if (!list || !list.length) return bad(res, 'occurrences is required');
    let total = 0;
    for (const o of list) {
      if (!Array.isArray(o.marks)) return bad(res, 'marks must be an array');
      total += o.marks.length;
    }
    if (total > MAX_MARKS_PER_SAVE) return bad(res, 'Too many changes in one save');
    const maxDate = addDays(todayUtc(), 2); // small cushion for timezones ahead of UTC

    // 1. Work out the service + type of every occurrence (nothing is written yet)
    const resolved = [];
    for (const o of list) {
      let service = null, type = null;
      if (o.serviceId) {
        if (!mongoose.isValidObjectId(o.serviceId)) return bad(res, 'Invalid serviceId');
        service = await Service.findById(o.serviceId);
        if (!service || !service.type) return bad(res, 'Unknown service', 404);
        type = await ServiceType.findById(service.type);
        if (!type) return bad(res, 'Unknown service type', 404);
        if (service.department && !canAccessDepartment(req.user, service.department)) return bad(res, 'Forbidden — that meeting belongs to another ministry', 403);
      } else {
        if (!mongoose.isValidObjectId(o.typeId)) return bad(res, 'Invalid typeId');
        type = await ServiceType.findById(o.typeId);
        if (!type || !type.active) return bad(res, 'Unknown or switched-off service type');
        if (type.kind !== 'weekly') return bad(res, `${type.name} dates must be set first (Add meeting date)`);
        if (!isIsoDate(o.date) || weekdayOf(o.date) !== type.weekday) return bad(res, `That date is not a ${type.name} day`);
      }
      const date = service ? service.serviceDate : o.date;
      if (date > maxDate) return bad(res, 'Attendance cannot be recorded for a future date');
      resolved.push({ o, service, type, date });
    }

    // 2. Validate every member (exists, in my ministry, belongs to this service)
    const ids = [...new Set(resolved.flatMap((r) => r.o.marks.map((m) => String(m.member))))];
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return bad(res, 'Invalid member id');
    const members = await Member.find({ _id: { $in: ids } }, 'department');
    const byId = new Map(members.map((m) => [String(m._id), m]));
    for (const r of resolved) {
      for (const mark of r.o.marks) {
        const m = byId.get(String(mark.member));
        if (!m) return bad(res, 'Unknown member', 404);
        if (!canAccessDepartment(req.user, m.department)) return bad(res, 'Forbidden — a member belongs to another ministry', 403);
        if (!typeAppliesTo(r.type, m.department)) return bad(res, `${r.type.name} does not apply to that member's ministry`);
        if (r.service && r.service.department && String(r.service.department) !== String(m.department)) return bad(res, 'That meeting belongs to another ministry');
        if (mark.status && !STATUSES.includes(mark.status)) return bad(res, 'Invalid status');
      }
    }

    // 3. Write
    let saved = 0, cleared = 0;
    const ops = [];
    for (const r of resolved) {
      if (!r.service) r.service = await findOrCreateWeekly(r.type, r.date, req.user._id);
      for (const mark of r.o.marks) {
        const key = { member: mark.member, service: r.service._id };
        if (mark.status) {
          const counted = ['present', 'late'].includes(mark.status);
          ops.push({ updateOne: { filter: key, upsert: true, update: { $set: {
            status: mark.status, date: r.date, source: 'manual', checkedInBy: req.user._id, checkedInAt: counted ? new Date() : null
          } } } });
          saved++;
        } else {
          ops.push({ deleteOne: { filter: key } });
          cleared++;
        }
      }
    }
    if (ops.length) await MemberAttendance.bulkWrite(ops, { ordered: false });

    await log({ user: req.user, action: 'update', module: 'attendance', details: `Saved attendance: ${saved} marked, ${cleared} cleared` });
    req.io?.emit('attendance:updated', { saved, cleared });
    res.json({ success: true, saved, cleared });
  } catch (err) { next(err); }
};

// POST /api/attendance-board/occurrences
// A ministry sets a meeting date (e.g. its Prayer Meeting). { typeId, date, departmentId?, repeatMonths? }
exports.addOccurrences = async (req, res, next) => {
  try {
    const { typeId, date } = req.body;
    if (!mongoose.isValidObjectId(typeId)) return bad(res, 'Invalid typeId');
    const type = await ServiceType.findById(typeId);
    if (!type || !type.active) return bad(res, 'Unknown or switched-off service type');
    if (type.kind !== 'custom') return bad(res, `${type.name} is a weekly service — its dates are automatic`);
    if (!isIsoDate(date)) return bad(res, 'date must be YYYY-MM-DD');
    const repeat = req.body.repeatMonths === undefined ? 0 : parseInt(req.body.repeatMonths, 10);
    if (!Number.isInteger(repeat) || repeat < 0 || repeat > 12) return bad(res, 'repeatMonths must be 0–12');

    // Which ministry is this meeting for?
    let deptId = req.body.departmentId || null;
    if (req.user.department) {
      if (deptId && String(deptId) !== String(req.user.department)) return bad(res, 'Forbidden — you can only set dates for your own ministry', 403);
      deptId = String(req.user.department);
    }
    if (deptId && !mongoose.isValidObjectId(deptId)) return bad(res, 'Invalid departmentId');
    if (deptId && !(await Department.exists({ _id: deptId }))) return bad(res, 'Department not found', 404);
    if (type.departments.length > 0) {
      if (!deptId) return bad(res, 'Choose which ministry this meeting is for');
      if (!type.departments.some((d) => String(d) === String(deptId))) return bad(res, `${type.name} does not apply to that ministry`);
    }

    const dates = Array.from({ length: repeat + 1 }, (_, i) => sameDayInMonthOffset(date, i));
    let created = 0;
    for (const d of dates) {
      const r = await Service.updateOne(
        { type: type._id, serviceDate: d, department: deptId },
        { $setOnInsert: { name: type.name, createdBy: req.user._id } },
        { upsert: true }
      );
      if (r.upsertedCount) created++;
    }
    await log({ user: req.user, action: 'create', module: 'attendance', details: `${type.name}: ${created} date(s) set from ${date}` });
    res.status(201).json({ success: true, created, skipped: dates.length - created, dates });
  } catch (err) { next(err); }
};

// DELETE /api/attendance-board/occurrences/:id  (custom meeting dates only)
exports.deleteOccurrence = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const service = await Service.findById(req.params.id);
    if (!service || !service.type) return bad(res, 'Meeting date not found', 404);
    const type = await ServiceType.findById(service.type);
    if (!type || type.kind !== 'custom') return bad(res, 'Only custom meeting dates can be removed here', 409);
    if (service.department) {
      if (!canAccessDepartment(req.user, service.department)) return bad(res, 'Forbidden — that meeting belongs to another ministry', 403);
    } else if (req.user.department) {
      return bad(res, 'Forbidden — only an administrator can remove a church-wide meeting', 403);
    }
    const removed = await MemberAttendance.deleteMany({ service: service._id });
    await service.deleteOne();
    await log({ user: req.user, action: 'delete', module: 'attendance', details: `${type.name} ${service.serviceDate} removed (${removed.deletedCount} marks)` });
    res.json({ success: true, deletedMarks: removed.deletedCount });
  } catch (err) { next(err); }
};
