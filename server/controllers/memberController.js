const mongoose = require('mongoose');
const Member = require('../models/Member');
const Cellgroup = require('../models/Cellgroup');
const Department = require('../models/Department');
const MemberPhoto = require('../models/MemberPhoto');
const { log } = require('../utils/logger');
const { canAccessDepartment } = require('../utils/access');
const { photoUrl, verifyPhotoSignature } = require('../utils/signing');

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only these fields can be set from the client (no memberId / registeredBy tampering).
const FIELDS = ['firstName', 'lastName', 'middleInitial', 'contact', 'email', 'gender', 'age', 'birthdate',
  'location', 'occupationType', 'occupationDetail', 'ministries', 'department', 'cellgroup', 'cgPosition', 'ageGroup',
  'profilingForm', 'baptizedWater', 'baptizedHolyGhost', 'status', 'dateJoined'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// A member's cellgroup must belong to the member's department.
async function checkPairing(department, cellgroup) {
  if (!department || !mongoose.isValidObjectId(department) || !(await Department.exists({ _id: department }))) return 'Choose a valid department';
  if (!cellgroup) return null;
  if (!mongoose.isValidObjectId(cellgroup)) return 'Invalid cellgroup';
  const cg = await Cellgroup.findById(cellgroup, 'department');
  if (!cg) return 'Cellgroup not found';
  if (String(cg.department) !== String(department)) return 'That cellgroup belongs to a different department';
  return null;
}

exports.getMembers = async (req, res, next) => {
  try {
    const { department, cellgroup, status, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (cellgroup)  filter.cellgroup  = cellgroup;
    if (status)     filter.status     = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { memberId: re }];
    }
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const [members, total] = await Promise.all([
      Member.find(filter).populate('department', 'name slug').populate('cellgroup', 'name')
        .sort({ lastName: 1 }).skip((page - 1) * limit).limit(limit),
      Member.countDocuments(filter)
    ]);
    res.json({ success: true, count: members.length, total, page, pages: Math.ceil(total / limit), data: members });
  } catch (err) { next(err); }
};

exports.getMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id).populate('department', 'name slug').populate('cellgroup', 'name');
    if (!member) return bad(res, 'Member not found', 404);
    res.json({ success: true, data: member });
  } catch (err) { next(err); }
};

exports.createMember = async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (data.cellgroup === '') data.cellgroup = null;
    if (data.birthdate === '') data.birthdate = null;
    const problem = await checkPairing(data.department, data.cellgroup);
    if (problem) return bad(res, problem);
    const member = await Member.create({ ...data, registeredBy: req.user._id });
    await log({ user: req.user, action: 'create', module: 'members', recordId: member._id, details: member.fullName });
    res.status(201).json({ success: true, data: member });
  } catch (err) { next(err); }
};

exports.updateMember = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const existing = await Member.findById(req.params.id);
    if (!existing) return bad(res, 'Member not found', 404);

    const data = pick(req.body);
    if (data.cellgroup === '') data.cellgroup = null;
    if (data.birthdate === '') data.birthdate = null;
    const department = data.department !== undefined ? data.department : existing.department;
    const cellgroup = data.cellgroup !== undefined ? data.cellgroup : existing.cellgroup;
    const problem = await checkPairing(department, cellgroup);
    if (problem) return bad(res, problem);

    Object.assign(existing, data);
    await existing.save();
    await log({ user: req.user, action: 'update', module: 'members', recordId: existing._id });
    res.json({ success: true, data: existing });
  } catch (err) { next(err); }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return bad(res, 'Member not found', 404);
    await MemberPhoto.deleteOne({ member: member._id });
    await log({ user: req.user, action: 'delete', module: 'members', recordId: req.params.id });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

exports.getMemberStats = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.cellgroup)  filter.cellgroup  = req.query.cellgroup;

    const [total, active, needsFollowup, inactive, sundayGoer, otherChurch, bibleStudy] = await Promise.all([
      Member.countDocuments(filter),
      Member.countDocuments({ ...filter, status: 'active' }),
      Member.countDocuments({ ...filter, status: 'needs_followup' }),
      Member.countDocuments({ ...filter, status: 'inactive' }),
      Member.countDocuments({ ...filter, status: 'sunday_goer' }),
      Member.countDocuments({ ...filter, status: 'other_church' }),
      Member.countDocuments({ ...filter, status: 'bible_study' })
    ]);
    res.json({ success: true, data: { total, active, needsFollowup, inactive, sundayGoer, otherChurch, bibleStudy } });
  } catch (err) { next(err); }
};

// ───────────────────────── Photos ─────────────────────────
const MAX_PHOTO_BYTES = 400 * 1024;

// "data:image/jpeg;base64,...." -> { type, buffer } or null. Checks the real file signature, not just the label.
function decodeImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
  const ok = (m[1] === 'image/jpeg' && isJpeg) || (m[1] === 'image/png' && isPng) || (m[1] === 'image/webp' && isWebp);
  return ok ? { type: m[1], buffer } : null;
}

// PUT /api/members/:id/photo   { image: "data:image/jpeg;base64,..." }  (the app shrinks photos to ~480px before sending)
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const member = await Member.findById(req.params.id);
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department)) return bad(res, 'Forbidden — that member belongs to another ministry', 403);

    const img = decodeImage(req.body.image);
    if (!img) return bad(res, 'Please choose a JPG, PNG or WebP photo under 400 KB');

    await MemberPhoto.findOneAndUpdate(
      { member: member._id },
      { member: member._id, contentType: img.type, data: img.buffer, size: img.buffer.length },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    member.photoUrl = photoUrl(member._id, Date.now());
    await member.save();
    await log({ user: req.user, action: 'update', module: 'members', recordId: member._id, details: 'Updated photo' });
    res.json({ success: true, data: { photoUrl: member.photoUrl } });
  } catch (err) { next(err); }
};

// GET /api/members/:id/photo?s=<signature>&v=<version>
// No login header (so <img> works) — the signature in the link is the key, and it can't be guessed.
exports.getPhoto = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !verifyPhotoSignature(req.params.id, req.query.s)) return res.status(404).end();
    const photo = await MemberPhoto.findOne({ member: req.params.id });
    if (!photo) return res.status(404).end();
    res.set({ 'Content-Type': photo.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' });
    res.send(photo.data);
  } catch (err) { next(err); }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Invalid id');
    const member = await Member.findById(req.params.id);
    if (!member) return bad(res, 'Member not found', 404);
    if (!canAccessDepartment(req.user, member.department)) return bad(res, 'Forbidden — that member belongs to another ministry', 403);
    await MemberPhoto.deleteOne({ member: member._id });
    member.photoUrl = '';
    await member.save();
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
