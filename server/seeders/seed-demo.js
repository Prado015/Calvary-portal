// Optional demo data: a service for today, 30 Youth members across the 5
// cellgroups, and attendance history for the last 4 Sundays + part of today.
// Safe to re-run: does nothing if Youth members already exist.
// Run AFTER `npm run seed`:  npm run seed:demo
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const Cellgroup = require('../models/Cellgroup');
const Member = require('../models/Member');
const Service = require('../models/Service');
const ServiceType = require('../models/ServiceType');
const { ensureServiceTypes } = require('../utils/ensureServiceTypes');
const MemberAttendance = require('../models/MemberAttendance');

const FIRST = ['Maria','Paul','Angela','Mark','Joyce','Peter','Allen','Joshua','Kevin','Jayson','Grace','Daniel','Ruth','Samuel','Faith','Caleb','Hannah','Isaac','Lydia','Noah'];
const LAST  = ['Santos','Garcia','Reyes','Dela Cruz','Ramirez','Cruz','Tan','Molina','Lopez','Rivera','Bautista','Mendoza'];
const iso = (d) => d.toISOString().split('T')[0];

(async () => {
  await connectDB();
  const youth = await Department.findOne({ slug: 'youth' });
  if (!youth) { console.log('Run `npm run seed` first (no Youth department found).'); process.exit(1); }
  if (await Member.countDocuments({ department: youth._id }) > 0) {
    console.log('Youth members already exist — skipping demo data.'); process.exit(0);
  }

  await ensureServiceTypes();
  const sunday = await ServiceType.findOne({ code: 'sunday' });
  const cells = await Cellgroup.find({ department: youth._id }).sort({ name: 1 });
  const members = [];
  for (let i = 0; i < 30; i++) {
    const status = i % 10 === 0 ? 'inactive' : i % 6 === 0 ? 'needs_followup' : 'active';
    members.push(await Member.create({
      firstName: FIRST[i % FIRST.length], lastName: LAST[(i * 7) % LAST.length],
      contact: `09${String(100000000 + i * 137).slice(0, 9)}`, gender: i % 2 ? 'Female' : 'Male',
      department: youth._id, cellgroup: cells[i % cells.length]._id, status,
      dateJoined: new Date(Date.now() - (i + 1) * 20 * 86400000)
    }));
  }

  // The 5 most recent Sundays (today counts if it is a Sunday), oldest first.
  const d = new Date();
  const lastSunday = new Date(d);
  lastSunday.setDate(d.getDate() - d.getDay());
  const dates = [];
  for (let w = 4; w >= 0; w--) { const x = new Date(lastSunday); x.setDate(lastSunday.getDate() - 7 * w); dates.push(x); }
  let records = 0;
  for (const [idx, day] of dates.entries()) {
    const date = iso(day);
    // Same shape the Attendance Checker creates: a typed, church-wide Sunday Service.
    let svc = await Service.findOne({ type: sunday._id, serviceDate: date, department: null });
    if (!svc) svc = await Service.create({ name: sunday.name, type: sunday._id, serviceDate: date, department: null });
    const isToday = idx === dates.length - 1; // the most recent Sunday gets lower attendance
    for (const [i, m] of members.entries()) {
      if (m.status === 'inactive') continue;
      const chance = isToday ? 0.55 : 0.8;
      if (((i * 31 + idx * 17) % 100) / 100 > chance) continue;
      await MemberAttendance.create({ member: m._id, service: svc._id, date, status: i % 9 === 0 ? 'late' : 'present', checkedInAt: new Date(), source: 'manual' });
      records++;
    }
  }
  console.log(`Demo data created: ${members.length} Youth members, ${dates.length} services, ${records} attendance records.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
