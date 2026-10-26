const mongoose = require('mongoose');
const ServiceType = require('../models/ServiceType');
const Service = require('../models/Service');
const Department = require('../models/Department');
const { log } = require('../utils/logger');

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const isAdmin = (user) => ['super_admin', 'head_usher'].includes(user.role);

// GET /api/service-types[?all=true]
// Everyone sees the active types that apply to them. Admins can ask for all (incl. switched off).
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (!(req.query.all === 'true' && isAdmin(req.user))) filter.active = true;
    let types = await ServiceType.find(filter).populate('departments', 'name slug').sort({ sortOrder: 1, name: 1 });
    if (req.user.department) {
      const mine = String(req.user.department);
      types = types.filter((t) => t.departments.length === 0 || t.departments.some((d) => String(d._id) === mine));
    }
    res.json({ success: true, count: types.length, data: types });
  } catch (err) { next(err); }
};

// Validates + whitelists the body. Returns { error } or { value }.
async function parseBody(body, partial = false) {
  const v = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 60) return { error: 'Name must be 2–60 characters' };
    v.name = name;
  }
  if (!partial || body.kind !== undefined) {
    if (!['weekly', 'custom'].includes(body.kind)) return { error: 'kind must be weekly or custom' };
    v.kind = body.kind;
  }
  if (body.kind === 'weekly' || (partial && body.weekday !== undefined && body.kind !== 'custom')) {
    const wd = body.weekday === null || body.weekday === undefined || body.weekday === '' ? NaN : Number(body.weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) return { error: 'weekday must be 0 (Sunday) to 6 (Saturday)' };
    v.weekday = wd;
  }
  if (body.kind === 'custom') v.weekday = null;
  if (body.color !== undefined) {
    if (!ServiceType.COLORS.includes(body.color)) return { error: 'Invalid color' };
    v.color = body.color;
  }
  if (body.active !== undefined) v.active = Boolean(body.active);
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n)) return { error: 'sortOrder must be a number' };
    v.sortOrder = n;
  }
  if (body.departments !== undefined) {
    const ids = Array.isArray(body.departments) ? body.departments : [];
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return { error: 'Invalid department id' };
    const found = await Department.countDocuments({ _id: { $in: ids } });
    if (found !== new Set(ids.map(String)).size) return { error: 'One or more departments do not exist' };
    v.departments = ids;
  }
  return { value: v };
}

exports.create = async (req, res, next) => {
  try {
    const { error, value } = await parseBody(req.body);
    if (error) return bad(res, error);
    const type = await ServiceType.create(value);
    await log({ user: req.user, action: 'create', module: 'service-types', recordId: type._id, details: type.name });
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    if (err.code === 11000) return bad(res, 'A service type with that name already exists', 409);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const type = await ServiceType.findById(req.params.id);
    if (!type) return bad(res, 'Service type not found', 404);

    const merged = { kind: type.kind, weekday: type.weekday, ...req.body };
    const { error, value } = await parseBody(merged, true);
    if (error) return bad(res, error);
    Object.assign(type, value);
    await type.save();
    await log({ user: req.user, action: 'update', module: 'service-types', recordId: type._id, details: type.name });
    res.json({ success: true, data: type });
  } catch (err) {
    if (err.code === 11000) return bad(res, 'A service type with that name already exists', 409);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const type = await ServiceType.findById(req.params.id);
    if (!type) return bad(res, 'Service type not found', 404);
    if (type.code) return bad(res, 'Built-in service types cannot be deleted — switch them off instead.', 409);
    const used = await Service.countDocuments({ type: type._id });
    if (used > 0) return bad(res, `This type has ${used} recorded service date(s). Switch it off instead of deleting it.`, 409);
    await type.deleteOne();
    await log({ user: req.user, action: 'delete', module: 'service-types', recordId: type._id, details: type.name });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
