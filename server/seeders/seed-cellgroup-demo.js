// Optional demo data for the Cell Group Monitoring Report. Fills the FIRST Youth
// cellgroup with leaders, member details (age, location, occupation, ministries),
// ~20 activities and this year's MTM Fund. Uses made-up names only.
// Run after `npm run seed` and `npm run seed:demo`:   npm run seed:cellgroup-demo
// Safe to re-run: does nothing if that cellgroup already has activities.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const Cellgroup = require('../models/Cellgroup');
const Member = require('../models/Member');
const CellgroupActivity = require('../models/CellgroupActivity');
const CellgroupFund = require('../models/CellgroupFund');

const LOCATIONS = ['Baguio City', 'La Trinidad', 'Itogon', 'Tuba', 'Sablan'];
const STUDENT_LEVELS = ['Grade 9', 'Grade 11', 'Grade 12', '1st year college', '3rd year college'];
const JOBS = ['Call center agent', 'Cashier, local store', 'Sales associate', 'Office clerk'];
const MINISTRY_SETS = [[], ['Music'], [], ['Media', 'Ushering'], [], [], ['Prayer']];
const iso = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

(async () => {
  await connectDB();
  const youth = await Department.findOne({ slug: 'youth' });
  if (!youth) { console.log('Run `npm run seed` first (no Youth department).'); process.exit(1); }
  const cells = await Cellgroup.find({ department: youth._id }).sort({ name: 1 });
  const cell = cells[0];
  if (!cell) { console.log('No Youth cellgroups found.'); process.exit(1); }
  if (await CellgroupActivity.countDocuments({ cellgroup: cell._id }) > 0) {
    console.log(`${cell.name} already has activities — skipping.`); process.exit(0);
  }

  cell.leaderName = 'Demo Leader';
  cell.assistantLeaders = ['Demo Assistant One', 'Demo Assistant Two'];
  await cell.save();

  // Enrich Youth members with the sheet's fields
  const members = await Member.find({ department: youth._id }).sort({ createdAt: 1 });
  for (const [i, m] of members.entries()) {
    const set = {
      age: 14 + (i % 14),
      location: LOCATIONS[i % LOCATIONS.length],
      ministries: MINISTRY_SETS[i % MINISTRY_SETS.length]
    };
    if (i % 3 === 0) { set.occupationType = 'working'; set.occupationDetail = JOBS[i % JOBS.length]; }
    else { set.occupationType = 'student'; set.occupationDetail = STUDENT_LEVELS[i % STUDENT_LEVELS.length]; }
    if (m.status === 'active' && i % 7 === 3) set.status = 'sunday_goer';
    if (m.status === 'active' && i % 13 === 5) set.status = 'other_church';
    await Member.updateOne({ _id: m._id }, { $set: set });
  }

  // Activities: Friday Youth Service + Sunday Service for the last 10 weeks
  const roster = members.filter((m) => String(m.cellgroup) === String(cell._id));
  const today = new Date();
  const lastSunday = addDays(today, -today.getDay());
  let count = 0;
  for (let w = 9; w >= 0; w--) {
    const sunday = addDays(lastSunday, -7 * w);
    const friday = addDays(sunday, -2);
    for (const [type, date] of [['Youth Service', friday], ['Sunday Service', sunday]]) {
      const absent = roster.length
        ? [...new Set([roster[(w * 3) % roster.length], roster[(w * 5 + 1) % roster.length]].filter(Boolean).map((m) => String(m._id)))]
        : [];
      await CellgroupActivity.create({
        cellgroup: cell._id, date: iso(date), type,
        attendeeCount: Math.max(roster.length - absent.length, 0) + (w % 4 === 0 ? 1 : 0),
        absentMembers: absent,
        remarks: w % 3 === 0 ? 'Good participation; follow up with those absent.' : ''
      });
      count++;
    }
  }

  // MTM Fund for this year, January up to the current month
  const year = today.getFullYear();
  const amounts = [500, 100, 350, 350, 600, 600, 600, 400, 500, 500, 500, 500];
  for (let m = 1; m <= today.getMonth() + 1; m++) {
    await CellgroupFund.create({
      cellgroup: cell._id, year, month: m, amount: amounts[m - 1],
      dateSubmitted: iso(new Date(year, m - 1, 8 + (m % 15))), remarks: ''
    });
  }

  console.log(`Cellgroup demo ready: "${cell.name}" — ${count} activities, ${today.getMonth() + 1} months of MTM Fund, ${members.length} members enriched.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
