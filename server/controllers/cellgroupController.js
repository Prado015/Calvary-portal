const mongoose = require('mongoose');
const Cellgroup = require('../models/Cellgroup');
const Department = require('../models/Department');
const Member = require('../models/Member');
const CellgroupActivity = require('../models/CellgroupActivity');
const CellgroupFund = require('../models/CellgroupFund');
const { log } = require('../utils/logger');
const { canAccessDepartment } = require('../utils/access');

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

// GET /api/cellgroups[?department=][&includeInactive=true][&withCounts=true]
exports.getCellgroups = async (req, res, next) => {
  try {
    const filter = req.query.includeInactive === 'true' ? {} : { active: true };
    if (req.query.department) filter.department = req.query.department;
    const cellgroups = await Cellgroup.find(filter)
      .populate('leader', 'firstName lastName')
      .populate('department', 'name slug')
      .sort({ name: 1 });

    if (req.query.withCounts !== 'true') {
      return res.json({ success: true, count: cellgroups.length, data: cellgroups });
    }
    const rows = await Member.aggregate([{ $match: { cellgroup: { $ne: null } } }, { $group: { _id: '$cellgroup', n: { $sum: 1 } } }]);
    const counts = new Map(rows.map((r) => [String(r._id), r.n]));
    const data = cellgroups.map((c) => ({ ...c.toObject(), memberCount: counts.get(String(c._id)) || 0 }));
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
};

exports.createCellgroup = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2 || name.length > 80) return bad(res, 'Name must be 2–80 characters');
    if (!mongoose.isValidObjectId(req.body.department) || !(await Department.exists({ _id: req.body.department }))) {
      return bad(res, 'Choose a valid department');
    }
    const cellgroup = await Cellgroup.create({
      name, department: req.body.department,
      leaderName: String(req.body.leaderName || '').trim(),
      assistantLeaders: Array.isArray(req.body.assistantLeaders) ? req.body.assistantLeaders.map((n) => String(n).trim()).filter(Boolean).slice(0, 20) : []
    });
    await log({ user: req.user, action: 'create', module: 'cellgroups', recordId: cellgroup._id, details: cellgroup.name });
    res.status(201).json({ success: true, data: cellgroup });
  } catch (err) { next(err); }
};

exports.updateCellgroup = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const existing = await Cellgroup.findById(req.params.id);
    if (!existing) return bad(res, 'Cellgroup not found', 404);
    if (!canAccessDepartment(req.user, existing.department)) return bad(res, 'Forbidden — this cellgroup belongs to another ministry', 403);

    // Secretaries/portal managers may only edit who leads the group.
    // Super admin / head usher may edit everything.
    const isAdmin = ['super_admin', 'head_usher'].includes(req.user.role);
    const update = {};
    if (req.body.leaderName !== undefined) update.leaderName = String(req.body.leaderName).trim();
    if (Array.isArray(req.body.assistantLeaders)) {
      update.assistantLeaders = req.body.assistantLeaders.map((n) => String(n).trim()).filter(Boolean).slice(0, 20);
    }
    if (isAdmin) {
      if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();
        if (name.length < 2 || name.length > 80) return bad(res, 'Name must be 2–80 characters');
        update.name = name;
      }
      if (req.body.active !== undefined) update.active = Boolean(req.body.active);
      if (req.body.department !== undefined && String(req.body.department) !== String(existing.department)) {
        if (!mongoose.isValidObjectId(req.body.department) || !(await Department.exists({ _id: req.body.department }))) return bad(res, 'Choose a valid department');
        const members = await Member.countDocuments({ cellgroup: existing._id });
        if (members) return bad(res, `This cellgroup has ${members} member(s). Move them to another cellgroup before changing its department.`, 409);
        update.department = req.body.department;
      }
    }

    const cellgroup = await Cellgroup.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    await log({ user: req.user, action: 'update', module: 'cellgroups', recordId: cellgroup._id });
    res.json({ success: true, data: cellgroup });
  } catch (err) { next(err); }
};

// Blocked while the group still has people or report history; switch it off instead.
exports.deleteCellgroup = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const id = req.params.id;
    const [members, activities, funds] = await Promise.all([
      Member.countDocuments({ cellgroup: id }), CellgroupActivity.countDocuments({ cellgroup: id }), CellgroupFund.countDocuments({ cellgroup: id })
    ]);
    if (members) return bad(res, `This cellgroup still has ${members} member(s). Move them first, or switch the cellgroup off instead.`, 409);
    if (activities || funds) return bad(res, 'This cellgroup has report history (activities / MTM Fund). Switch it off instead of deleting it.', 409);
    const cellgroup = await Cellgroup.findByIdAndDelete(id);
    if (!cellgroup) return bad(res, 'Cellgroup not found', 404);
    await log({ user: req.user, action: 'delete', module: 'cellgroups', recordId: id, details: cellgroup.name });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
