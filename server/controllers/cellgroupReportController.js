const mongoose = require('mongoose');
const Cellgroup = require('../models/Cellgroup');
const Member = require('../models/Member');
const CellgroupActivity = require('../models/CellgroupActivity');
const CellgroupFund = require('../models/CellgroupFund');
const { canAccessDepartment } = require('../utils/access');
const { log } = require('../utils/logger');

const ACTIVITY_TYPES = CellgroupActivity.ACTIVITY_TYPES;

const badRequest = (res, message) => res.status(400).json({ success: false, message });

// Loads the cellgroup and enforces department scoping. Returns null after
// sending an error response, so callers just `if (!cg) return;`.
async function loadCellgroup(req, res, id) {
  if (!mongoose.isValidObjectId(id)) { badRequest(res, 'Invalid cellgroup id'); return null; }
  const cg = await Cellgroup.findById(id).populate('department', 'name slug');
  if (!cg) { res.status(404).json({ success: false, message: 'Cellgroup not found' }); return null; }
  if (!canAccessDepartment(req.user, cg.department._id)) {
    res.status(403).json({ success: false, message: 'Forbidden — this cellgroup belongs to another ministry' });
    return null;
  }
  return cg;
}

const parseYear = (v) => {
  const y = parseInt(v, 10);
  return y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
};

// GET /api/cellgroup-reports/:cellgroupId?year=2025
// Everything the Cell Group Monitoring Report shows, in one response.
exports.getReport = async (req, res, next) => {
  try {
    const cg = await loadCellgroup(req, res, req.params.cellgroupId);
    if (!cg) return;
    const year = parseYear(req.query.year);

    const [members, activities, funds] = await Promise.all([
      Member.find({ cellgroup: cg._id }).sort({ lastName: 1, firstName: 1 }),
      CellgroupActivity.find({ cellgroup: cg._id, date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } })
        .populate('absentMembers', 'firstName lastName').sort({ date: 1 }),
      CellgroupFund.find({ cellgroup: cg._id, year: { $in: [year - 1, year] } })
    ]);

    const countBy = (status) => members.filter((m) => m.status === status).length;
    const meetings = activities.length;
    const avgAttendance = meetings ? Math.round(activities.reduce((a, x) => a + x.attendeeCount, 0) / meetings) : 0;
    const fundTotal = funds.filter((f) => f.year === year).reduce((a, f) => a + f.amount, 0);

    res.json({
      success: true,
      year,
      activityTypes: ACTIVITY_TYPES,
      cellgroup: {
        _id: cg._id, name: cg.name, department: cg.department,
        leaderName: cg.leaderName || '', assistantLeaders: cg.assistantLeaders || []
      },
      members: {
        male: members.filter((m) => m.gender === 'Male'),
        female: members.filter((m) => m.gender === 'Female'),
        unspecified: members.filter((m) => m.gender !== 'Male' && m.gender !== 'Female')
      },
      activities,
      funds,
      summary: {
        roster: members.length,
        active: countBy('active'), sundayGoer: countBy('sunday_goer'), inactive: countBy('inactive'),
        otherChurch: countBy('other_church'), needsFollowup: countBy('needs_followup'),
        meetings, avgAttendance, fundTotal
      }
    });
  } catch (err) { next(err); }
};

// Validates an activity body; returns { error } or { value }.
async function parseActivity(body, cellgroupId) {
  const { date, type, remarks } = body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { error: 'date must be YYYY-MM-DD' };
  if (!ACTIVITY_TYPES.includes(type)) return { error: 'Invalid activity type' };
  const attendeeCount = parseInt(body.attendeeCount, 10);
  if (isNaN(attendeeCount) || attendeeCount < 0 || attendeeCount > 100000) return { error: 'attendeeCount must be a non-negative number' };

  // Only members of THIS cellgroup can be marked absent.
  const requested = Array.isArray(body.absentMembers) ? body.absentMembers.filter((id) => mongoose.isValidObjectId(id)) : [];
  const valid = requested.length ? await Member.find({ _id: { $in: requested }, cellgroup: cellgroupId }, '_id') : [];

  return { value: { date, type, attendeeCount, absentMembers: valid.map((m) => m._id), remarks: String(remarks || '').slice(0, 2000) } };
}

// POST /api/cellgroup-reports/:cellgroupId/activities
exports.createActivity = async (req, res, next) => {
  try {
    const cg = await loadCellgroup(req, res, req.params.cellgroupId);
    if (!cg) return;
    const { error, value } = await parseActivity(req.body, cg._id);
    if (error) return badRequest(res, error);
    const activity = await CellgroupActivity.create({ ...value, cellgroup: cg._id, recordedBy: req.user._id });
    await log({ user: req.user, action: 'create', module: 'cellgroup-activities', recordId: activity._id, details: `${cg.name}: ${value.type} ${value.date}` });
    res.status(201).json({ success: true, data: activity });
  } catch (err) { next(err); }
};

// PUT /api/cellgroup-reports/activities/:id
exports.updateActivity = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid id');
    const activity = await CellgroupActivity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    const cg = await loadCellgroup(req, res, activity.cellgroup);
    if (!cg) return;
    const { error, value } = await parseActivity(req.body, cg._id);
    if (error) return badRequest(res, error);
    Object.assign(activity, value);
    await activity.save();
    await log({ user: req.user, action: 'update', module: 'cellgroup-activities', recordId: activity._id });
    res.json({ success: true, data: activity });
  } catch (err) { next(err); }
};

// DELETE /api/cellgroup-reports/activities/:id
exports.deleteActivity = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid id');
    const activity = await CellgroupActivity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    const cg = await loadCellgroup(req, res, activity.cellgroup);
    if (!cg) return;
    await activity.deleteOne();
    await log({ user: req.user, action: 'delete', module: 'cellgroup-activities', recordId: activity._id });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

// PUT /api/cellgroup-reports/:cellgroupId/funds
// Upsert one month. Sending a blank amount clears that month's entry.
exports.saveFund = async (req, res, next) => {
  try {
    const cg = await loadCellgroup(req, res, req.params.cellgroupId);
    if (!cg) return;
    const year = parseInt(req.body.year, 10);
    const month = parseInt(req.body.month, 10);
    if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12)) return badRequest(res, 'Valid year and month (1-12) are required');

    const key = { cellgroup: cg._id, year, month };
    const blank = req.body.amount === '' || req.body.amount === null || req.body.amount === undefined;
    if (blank) {
      await CellgroupFund.deleteOne(key);
      return res.json({ success: true, data: null });
    }
    const amount = Number(req.body.amount);
    if (!isFinite(amount) || amount < 0) return badRequest(res, 'amount must be a non-negative number');
    const dateSubmitted = req.body.dateSubmitted || '';
    if (dateSubmitted && !/^\d{4}-\d{2}-\d{2}$/.test(dateSubmitted)) return badRequest(res, 'dateSubmitted must be YYYY-MM-DD');

    const fund = await CellgroupFund.findOneAndUpdate(
      key,
      { ...key, amount, dateSubmitted, remarks: String(req.body.remarks || '').slice(0, 500), recordedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    await log({ user: req.user, action: 'update', module: 'cellgroup-funds', recordId: fund._id, details: `${cg.name} ${year}-${month}` });
    res.json({ success: true, data: fund });
  } catch (err) { next(err); }
};
