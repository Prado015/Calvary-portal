// Works out who has stopped coming.
//
// A service counts as "held" once at least one person was marked present/late at it.
// A member's "missed streak" is how many of the most recent held services in a row they were NOT present at.
// Members at or over the threshold are flagged. Members flagged by hand (status = needs_followup) always show up.
const Member = require('../models/Member');
const Service = require('../models/Service');
const ServiceType = require('../models/ServiceType');
const MemberAttendance = require('../models/MemberAttendance');
const FollowUp = require('../models/FollowUp');
const { todayUtc } = require('./dates');

const TRACKED_STATUSES = ['active', 'sunday_goer', 'needs_followup'];
const LOOKBACK = 12; // how many recent held services to look at

async function computeFollowUps({ department = null, cellgroup = null, threshold = 3 } = {}) {
  threshold = Math.min(Math.max(parseInt(threshold, 10) || 3, 1), LOOKBACK);

  const type = (await ServiceType.findOne({ code: 'sunday' })) ||
    (await ServiceType.findOne({ kind: 'weekly', active: true }).sort({ sortOrder: 1 }));
  const meta = { threshold, serviceType: type ? type.name : null, heldServices: 0, lookback: LOOKBACK };

  const filter = { status: { $in: TRACKED_STATUSES } };
  if (department) filter.department = department;
  if (cellgroup) filter.cellgroup = cellgroup;
  const members = await Member.find(filter).populate('cellgroup', 'name leaderName').populate('department', 'name slug');

  // Recent held services (newest first)
  let held = [];
  if (type) {
    const services = await Service.find({ type: type._id, department: null, serviceDate: { $lte: todayUtc() } }).sort({ serviceDate: -1 }).limit(40);
    if (services.length) {
      const heldIds = new Set((await MemberAttendance.aggregate([
        { $match: { service: { $in: services.map((s) => s._id) }, status: { $in: ['present', 'late'] } } },
        { $group: { _id: '$service' } }
      ])).map((r) => String(r._id)));
      held = services.filter((s) => heldIds.has(String(s._id))).slice(0, LOOKBACK);
    }
  }
  meta.heldServices = held.length;

  // Who attended which held service
  const attended = new Map(); // memberId -> Set(serviceId)
  if (held.length && members.length) {
    const rows = await MemberAttendance.find(
      { service: { $in: held.map((s) => s._id) }, member: { $in: members.map((m) => m._id) }, status: { $in: ['present', 'late'] } }, 'member service');
    for (const r of rows) {
      const k = String(r.member);
      if (!attended.has(k)) attended.set(k, new Set());
      attended.get(k).add(String(r.service));
    }
  }

  const flagged = [];
  for (const m of members) {
    const seen = attended.get(String(m._id)) || new Set();
    let streak = 0;
    for (const s of held) { if (seen.has(String(s._id))) break; streak++; }
    const auto = held.length >= threshold && streak >= threshold;
    const manual = m.status === 'needs_followup';
    if (auto || manual) flagged.push({ member: m, streak, auto, manual });
  }

  // Last time each flagged member was actually present (any service), and last time someone reached out
  const ids = flagged.map((f) => f.member._id);
  const lastSeen = new Map(), lastContact = new Map();
  if (ids.length) {
    for (const r of await MemberAttendance.aggregate([
      { $match: { member: { $in: ids }, status: { $in: ['present', 'late'] } } },
      { $group: { _id: '$member', date: { $max: '$date' } } }])) lastSeen.set(String(r._id), r.date);
    for (const r of await FollowUp.aggregate([
      { $match: { member: { $in: ids } } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$member', at: { $last: '$createdAt' }, method: { $last: '$method' } } }])) lastContact.set(String(r._id), { at: r.at, method: r.method });
  }

  const data = flagged
    .map((f) => {
      const contact = lastContact.get(String(f.member._id)) || null;
      return {
        member: f.member, missed: f.streak, auto: f.auto, manual: f.manual,
        lastSeen: lastSeen.get(String(f.member._id)) || null,
        lastContact: contact ? contact.at : null, lastContactMethod: contact ? contact.method : null
      };
    })
    .sort((a, b) => b.missed - a.missed || String(a.member.lastName).localeCompare(String(b.member.lastName)));

  return { data, meta };
}

module.exports = { computeFollowUps, LOOKBACK };
