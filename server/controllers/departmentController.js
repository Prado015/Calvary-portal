const mongoose = require('mongoose');
const Department = require('../models/Department');
const Member = require('../models/Member');
const Cellgroup = require('../models/Cellgroup');
const User = require('../models/User');
const ServiceType = require('../models/ServiceType');
const { log } = require('../utils/logger');

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

// GET /api/departments/public — no auth. Name/slug only, for the login screen.
exports.getPublicDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ active: true }, 'name slug').sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) { next(err); }
};

exports.getDepartmentBySlug = async (req, res, next) => {
  try {
    const department = await Department.findOne({ slug: req.params.slug }).populate('leader', 'firstName lastName');
    if (!department) return bad(res, 'Department not found', 404);
    res.json({ success: true, data: department });
  } catch (err) { next(err); }
};

// GET /api/departments[?active=false][&withCounts=true]
exports.getDepartments = async (req, res, next) => {
  try {
    const filter = req.query.active === 'false' ? {} : { active: true };
    const departments = await Department.find(filter).populate('leader', 'firstName lastName').sort({ name: 1 });

    if (req.query.withCounts !== 'true') {
      return res.json({ success: true, count: departments.length, data: departments });
    }
    const countBy = async (Model) => {
      const rows = await Model.aggregate([{ $match: { department: { $ne: null } } }, { $group: { _id: '$department', n: { $sum: 1 } } }]);
      return new Map(rows.map((r) => [String(r._id), r.n]));
    };
    const [members, cellgroups, users] = await Promise.all([countBy(Member), countBy(Cellgroup), countBy(User)]);
    const data = departments.map((d) => ({
      ...d.toObject(),
      memberCount: members.get(String(d._id)) || 0,
      cellgroupCount: cellgroups.get(String(d._id)) || 0,
      userCount: users.get(String(d._id)) || 0
    }));
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
};

function parse(body, existing) {
  const v = {};
  if (body.name !== undefined || !existing) {
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 60) return { error: 'Name must be 2–60 characters' };
    v.name = name;
  }
  if (body.slug !== undefined || !existing) {
    const slug = body.slug ? String(body.slug).toLowerCase().trim() : slugify(v.name || existing.name);
    if (!SLUG.test(slug) || slug.length > 40) return { error: 'Slug may only use lowercase letters, numbers and single hyphens (max 40)' };
    v.slug = slug;
  }
  if (body.description !== undefined) v.description = String(body.description).slice(0, 300);
  if (body.active !== undefined) v.active = Boolean(body.active);
  return { value: v };
}

exports.createDepartment = async (req, res, next) => {
  try {
    const { error, value } = parse(req.body, null);
    if (error) return bad(res, error);
    const department = await Department.create(value);
    await log({ user: req.user, action: 'create', module: 'departments', recordId: department._id, details: department.name });
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    if (err.code === 11000) return bad(res, 'A department with that name or slug already exists', 409);
    next(err);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const existing = await Department.findById(req.params.id);
    if (!existing) return bad(res, 'Department not found', 404);
    const { error, value } = parse(req.body, existing);
    if (error) return bad(res, error);
    Object.assign(existing, value);
    await existing.save();
    await log({ user: req.user, action: 'update', module: 'departments', recordId: existing._id });
    res.json({ success: true, data: existing });
  } catch (err) {
    if (err.code === 11000) return bad(res, 'A department with that name or slug already exists', 409);
    next(err);
  }
};

// Deleting a ministry that still has people would leave orphaned records, so it is blocked.
exports.deleteDepartment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const id = req.params.id;
    const [members, cellgroups, users, types] = await Promise.all([
      Member.countDocuments({ department: id }), Cellgroup.countDocuments({ department: id }),
      User.countDocuments({ department: id }), ServiceType.countDocuments({ departments: id })
    ]);
    if (members || cellgroups || users || types) {
      const parts = [];
      if (members) parts.push(`${members} member(s)`);
      if (cellgroups) parts.push(`${cellgroups} cellgroup(s)`);
      if (users) parts.push(`${users} user account(s)`);
      if (types) parts.push(`${types} service type(s)`);
      return bad(res, `This ministry still has ${parts.join(', ')}. Move or remove them first, or switch the department off instead.`, 409);
    }
    const department = await Department.findByIdAndDelete(id);
    if (!department) return bad(res, 'Department not found', 404);
    await log({ user: req.user, action: 'delete', module: 'departments', recordId: id, details: department.name });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
