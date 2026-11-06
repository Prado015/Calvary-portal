const mongoose = require('mongoose');
const Member = require('../models/Member');
const FollowUp = require('../models/FollowUp');
const { computeFollowUps } = require('../utils/followup');
const { canAccessDepartment } = require('../utils/access');
const { log } = require('../utils/logger');

const METHODS = ['call', 'sms', 'email', 'chat', 'visit', 'other'];
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

// GET /api/followup?department=&cellgroup=&threshold=3
// Members who missed `threshold` or more held services in a row (plus anyone flagged by hand).
exports.list = async (req, res, next) => {
  try {
    let department = req.query.department || null;
    if (req.user.department) {
      if (department && String(department) !== String(req.user.department)) return bad(res, 'Forbidden — you can only view your own ministry', 403);
      department = String(req.user.department);
    }
    for (const id of [department, req.query.cellgroup]) if (id && !mongoose.isValidObjectId(id)) return bad(res, 'Invalid id');

    const { data, meta } = await computeFollowUps({ department, cellgroup: req.query.cellgroup || null, threshold: req.query.threshold });
    res.json({ success: true, count: data.length, meta, data });
  } catch (err) { next(err); }
};

// POST /api/followup/:memberId/log   { method, note }
exports.addLog = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.memberId)) return bad(res, 'Invalid id');
    const member = await Member.findById(req.params.memberId, 'department firstName lastName');
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department)) return bad(res, 'Forbidden — that member belongs to another ministry', 403);

    const method = METHODS.includes(req.body.method) ? req.body.method : 'call';
    const note = String(req.body.note || '').trim().slice(0, 500);
    const entry = await FollowUp.create({ member: member._id, method, note, by: req.user._id });
    await log({ user: req.user, action: 'create', module: 'followup', recordId: member._id, details: `${method} — ${member.firstName} ${member.lastName}` });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
};

// GET /api/followup/:memberId/logs
exports.getLogs = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.memberId)) return bad(res, 'Invalid id');
    const member = await Member.findById(req.params.memberId, 'department');
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department)) return bad(res, 'Forbidden — that member belongs to another ministry', 403);
    const logs = await FollowUp.find({ member: member._id }).populate('by', 'firstName lastName').sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) { next(err); }
};
