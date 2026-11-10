const mongoose = require('mongoose');
const Member = require('../models/Member');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const { canAccessMember } = require('../utils/access');
const { computeFollowUps } = require('../utils/followup');
const { providers, sendSms, sendEmail, renderTemplate, todayManila } = require('../utils/notify');
const { log } = require('../utils/logger');

const MAX_RECIPIENTS = 200;
const MAX_SMS = 459;   // 3 SMS segments
const MAX_EMAIL = 3000;
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

// Runs `fn` over `items` with at most `n` in flight at once.
async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// GET /api/notify/status — which channels the server can use
exports.status = (req, res) => res.json({ success: true, data: providers() });

// POST /api/notify/send   { memberIds[], channel: 'sms'|'email', message, subject?, kind? }
// {firstName} {lastName} {name} in the message are filled in per person.
exports.send = async (req, res, next) => {
  try {
    const { channel, kind } = req.body;
    const message = String(req.body.message || '').trim();
    const ids = Array.isArray(req.body.memberIds) ? [...new Set(req.body.memberIds.map(String))] : [];

    if (!['sms', 'email'].includes(channel)) return bad(res, 'Choose SMS or email');
    if (!ids.length) return bad(res, 'Choose at least one person');
    if (ids.length > MAX_RECIPIENTS) return bad(res, `You can message up to ${MAX_RECIPIENTS} people at a time`);
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return bad(res, 'Invalid member id');
    if (!message) return bad(res, 'Write a message first');
    if (channel === 'sms' && message.length > MAX_SMS) return bad(res, `Text messages are limited to ${MAX_SMS} characters`);
    if (channel === 'email' && message.length > MAX_EMAIL) return bad(res, `Emails are limited to ${MAX_EMAIL} characters`);
    if (!providers()[channel]) return bad(res, channel === 'sms' ? 'Text messaging is not set up on the server yet' : 'Email is not set up on the server yet', 503);

    const members = await Member.find({ _id: { $in: ids } }, 'firstName lastName contact email department cellgroup');
    if (members.length !== ids.length) return bad(res, 'Some members were not found', 404);
    if (members.some((m) => !canAccessMember(req.user, m))) return bad(res, 'Forbidden — a member is outside your access', 403);

    const savedKind = ['followup', 'broadcast', 'reminder'].includes(kind) ? kind : 'broadcast';
    const subject = String(req.body.subject || 'A message from Calvary Tabernacle').trim().slice(0, 120);

    const results = await mapPool(members, 5, async (m) => {
      const text = renderTemplate(message, m);
      const r = channel === 'sms' ? await sendSms(m.contact, text) : await sendEmail(m.email, renderTemplate(subject, m), text);
      await Notification.create({
        member: m._id, channel, kind: savedKind, to: r.to || (channel === 'sms' ? m.contact : m.email) || '',
        subject: channel === 'email' ? subject : '', message: text, status: r.status, error: r.error || '', sentBy: req.user._id
      }).catch(() => {});
      if (savedKind === 'followup' && r.status === 'sent') {
        await FollowUp.create({ member: m._id, method: channel, note: text.slice(0, 200), by: req.user._id }).catch(() => {});
      }
      return { memberId: String(m._id), name: `${m.firstName} ${m.lastName}`, status: r.status, error: r.error || '' };
    });

    const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), { sent: 0, failed: 0, skipped: 0 });
    await log({ user: req.user, action: 'create', module: 'messages', details: `${channel.toUpperCase()} to ${ids.length}: ${counts.sent} sent, ${counts.failed} failed, ${counts.skipped} skipped` });
    res.json({ success: true, counts, results });
  } catch (err) { next(err); }
};

// GET /api/notify/log?member=
exports.getLog = async (req, res, next) => {
  try {
    const { member } = req.query;
    if (!member || !mongoose.isValidObjectId(member)) return bad(res, 'member is required');
    const m = await Member.findById(member, 'department cellgroup');
    if (!m) return bad(res, 'Member not found', 404);
    if (!canAccessMember(req.user, m)) return bad(res, 'Forbidden — that member is outside your access', 403);
    const rows = await Notification.find({ member }).sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

// POST /api/notify/run-daily   (header  x-cron-key: <CRON_KEY>)
// Meant to be called once a day by a free scheduler such as cron-job.org — which also keeps a sleeping Render service awake.
//   BIRTHDAY_CHANNEL=sms|email   -> greets members on their birthday (off by default)
//   FOLLOWUP_DIGEST=on           -> on Mondays, emails admins / ministry accounts the list of people who stopped coming
exports.runDaily = async (req, res, next) => {
  try {
    if (!process.env.CRON_KEY) return bad(res, 'CRON_KEY is not set on the server', 503);
    if (req.get('x-cron-key') !== process.env.CRON_KEY) return bad(res, 'Forbidden', 403);

    const today = todayManila();
    const summary = { date: today, birthdays: { channel: process.env.BIRTHDAY_CHANNEL || 'off', sent: 0, skipped: 0, failed: 0 }, digest: { sent: 0, skipped: 0, failed: 0, ran: false } };
    const dayStart = new Date(`${today}T00:00:00+08:00`);

    // ── Birthdays ──
    const channel = process.env.BIRTHDAY_CHANNEL;
    if (['sms', 'email'].includes(channel) && providers()[channel]) {
      const [, mm, dd] = today.split('-').map(Number);
      const people = await Member.aggregate([
        { $match: { birthdate: { $ne: null }, status: { $in: ['active', 'sunday_goer', 'bible_study', 'needs_followup'] } } },
        { $match: { $expr: { $and: [{ $eq: [{ $month: '$birthdate' }, mm] }, { $eq: [{ $dayOfMonth: '$birthdate' }, dd] }] } } },
        { $project: { firstName: 1, lastName: 1, contact: 1, email: 1 } }
      ]);
      const template = process.env.BIRTHDAY_MESSAGE || 'Happy birthday, {firstName}! May the Lord bless you today and always. - Calvary Tabernacle';
      await mapPool(people, 5, async (m) => {
        if (await Notification.exists({ member: m._id, kind: 'birthday', createdAt: { $gte: dayStart } })) { summary.birthdays.skipped++; return; }
        const text = renderTemplate(template, m);
        const r = channel === 'sms' ? await sendSms(m.contact, text) : await sendEmail(m.email, 'Happy birthday!', text);
        await Notification.create({ member: m._id, channel, kind: 'birthday', to: r.to || '', subject: channel === 'email' ? 'Happy birthday!' : '', message: text, status: r.status, error: r.error || '' }).catch(() => {});
        summary.birthdays[r.status === 'sent' ? 'sent' : r.status === 'failed' ? 'failed' : 'skipped']++;
      });
    }

    // ── Monday follow-up digest ──
    const isMonday = new Date(`${today}T00:00:00Z`).getUTCDay() === 1;
    if (process.env.FOLLOWUP_DIGEST === 'on' && isMonday && providers().email) {
      summary.digest.ran = true;
      const staff = await User.find({ status: 'active', role: { $in: ['super_admin', 'head_usher', 'usher_secretary'] } }, 'firstName lastName email role department');
      const cache = new Map();
      for (const u of staff) {
        if (await Notification.exists({ user: u._id, kind: 'digest', createdAt: { $gte: dayStart } })) { summary.digest.skipped++; continue; }
        const key = u.department ? String(u.department) : 'all';
        if (!cache.has(key)) cache.set(key, await computeFollowUps({ department: u.department || null, threshold: 3 }));
        const { data, meta } = cache.get(key);
        if (!data.length) { summary.digest.skipped++; continue; }
        const lines = data.slice(0, 80).map((f) => {
          const m = f.member;
          return `- ${m.firstName} ${m.lastName} (${m.cellgroup ? m.cellgroup.name : 'no cellgroup'}${m.cellgroup && m.cellgroup.leaderName ? ', leader: ' + m.cellgroup.leaderName : ''}) - missed ${f.missed}, last seen ${f.lastSeen || 'never recorded'}${m.contact ? ', ' + m.contact : ''}`;
        });
        const text = `Hello ${u.firstName},\n\nThese members have not been marked present at the last ${meta.threshold}+ ${meta.serviceType || 'services'} (${data.length} total):\n\n${lines.join('\n')}${data.length > 80 ? `\n...and ${data.length - 80} more in the Follow-up Center.` : ''}\n\nOpen the Follow-up Center to call, text or log a visit.\n\n- Calvary Tabernacle Ministry System`;
        const subject = `Follow-up list: ${data.length} member${data.length === 1 ? '' : 's'} need a visit`;
        const r = await sendEmail(u.email, subject, text);
        await Notification.create({ user: u._id, channel: 'email', kind: 'digest', to: u.email, subject, message: text.slice(0, 1000), status: r.status, error: r.error || '' }).catch(() => {});
        summary.digest[r.status === 'sent' ? 'sent' : r.status === 'failed' ? 'failed' : 'skipped']++;
      }
    }

    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
};
