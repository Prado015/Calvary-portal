// Imports the church masterlist (.xlsx) into MongoDB.
//
//   cd server
//   npm install
//   # put the file at server/data/masterlist.xlsx (or pass --file=path)
//   npm run import:masterlist -- --dry                 # preview only, nothing is written
//   npm run import:masterlist                          # import; existing members are UPDATED from the sheet
//   npm run import:masterlist -- --new-only --dry      # preview: how many names are NEW vs already in the database
//   npm run import:masterlist -- --new-only            # add ONLY new names; anyone already in the database is skipped untouched
//
// Sheets read: LM, AMM, Youth, Childrens. Safe to re-run: members are matched on
// department + last name + first name + middle initial and updated, not duplicated.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const ExcelJS = require('exceljs');

const SHEETS = [
  { sheet: 'LM',        slug: 'lm',       deptName: 'Ladies Ministries' },
  { sheet: 'AMM',       slug: 'amm',      deptName: 'Adult Men Ministry' },
  { sheet: 'Youth',     slug: 'youth',    deptName: 'Youth Ministry' },
  { sheet: 'Childrens', slug: 'children', deptName: 'Children' }
];
const HEADER_ROW = 4;

const STATUS_MAP = {
  'active': 'active', 'sunday goer': 'sunday_goer', 'bible study': 'bible_study',
  'inactive': 'inactive', 'other church': 'other_church', 'needs follow-up': 'needs_followup'
};
const POSITION_MAP = {
  'leader': 'Leader', 'assistant leader': 'Assistant Leader', 'secretary': 'Secretary', 'member': 'Member'
};

// ── cell helpers ────────────────────────────────────────────────────────────
function cellValue(cell) {
  let v = cell?.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) v = v.result;            // formula -> cached result
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
    else if ('text' in v) v = v.text;           // hyperlink (emails)
    else v = null;
  }
  if (v && typeof v === 'object' && !(v instanceof Date)) return null; // error values
  return v === undefined ? null : v;
}
const str = (v) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const yes = (v) => /^y(es)?$/i.test(str(v));
const validDate = (v) => (v instanceof Date && !isNaN(v) ? v : null);

function ageFrom(birthdate, fallback) {
  if (birthdate) {
    const now = new Date();
    let a = now.getFullYear() - birthdate.getFullYear();
    const m = now.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) a--;
    if (a >= 0 && a <= 120) return a;
  }
  const n = parseInt(fallback, 10);
  return !isNaN(n) && n >= 0 && n <= 120 ? n : null;
}

// ── parse ───────────────────────────────────────────────────────────────────
async function parseMasterlist(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const out = [];
  const warnings = [];

  for (const cfg of SHEETS) {
    const ws = wb.getWorksheet(cfg.sheet);
    if (!ws) { warnings.push(`Sheet "${cfg.sheet}" not found — skipped`); continue; }

    // header name (lowercase) -> column number; first match wins
    const col = {};
    ws.getRow(HEADER_ROW).eachCell((cell, n) => {
      const h = str(cellValue(cell)).toLowerCase();
      if (h && !(h in col)) col[h] = n;
    });
    const get = (row, ...names) => {
      for (const n of names) if (col[n]) { const v = cellValue(row.getCell(col[n])); if (v != null && str(v) !== '') return v; }
      return null;
    };

    for (let r = HEADER_ROW + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const lastName = str(get(row, 'last name'));
      const firstName = str(get(row, 'first name'));
      if (!lastName && !firstName) continue;
      if (!lastName || !firstName) { warnings.push(`${cfg.sheet} row ${r}: missing ${!lastName ? 'last' : 'first'} name ("${firstName || lastName}") — skipped`); continue; }

      const rawStatus = str(get(row, 'status')).toLowerCase();
      let status = 'active'; // blank = active (no colour in the original sheet)
      if (rawStatus) {
        status = STATUS_MAP[rawStatus];
        if (!status) { warnings.push(`${cfg.sheet} row ${r}: unknown status "${rawStatus}" — set to active`); status = 'active'; }
      }

      const rawPos = str(get(row, 'cg position')).toLowerCase();
      const birthdate = validDate(get(row, 'birthdate'));
      const email = str(get(row, 'email')).toLowerCase();

      const location = [get(row, 'street'), get(row, 'city address'), get(row, 'provincial address')]
        .map(str).filter(Boolean).join(', ');

      // Occupation: working people (LM/AMM "Current Occupation", Youth "Occupation (if working)"),
      // otherwise students (Youth school name, Children grade level).
      const job = str(get(row, 'current occupation', 'occupation (if working)'));
      const school = str(get(row, 'school name'));
      const grade = str(get(row, 'grade level'));
      let occupationType = '', occupationDetail = '';
      if (job) { occupationType = 'working'; occupationDetail = job; }
      else if (school || grade) { occupationType = 'student'; occupationDetail = [grade, school].filter(Boolean).join(', '); }

      const ministries = str(get(row, 'church ministries (present)'))
        .split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);

      const gender = str(get(row, 'gender'));

      out.push({
        sheet: cfg.sheet, row: r, slug: cfg.slug, deptName: cfg.deptName,
        cellgroupName: str(get(row, 'cell group')),
        data: {
          firstName, lastName,
          middleInitial: str(get(row, 'middle initial')),
          gender: ['Male', 'Female'].includes(gender) ? gender : '',
          contact: str(get(row, 'contact number')),
          email: email.includes('@') ? email : '',
          birthdate,
          age: ageFrom(birthdate, get(row, 'age')),
          location,
          occupationType, occupationDetail, ministries,
          status,
          cgPosition: POSITION_MAP[rawPos] || '',
          ageGroup: str(get(row, 'age group')).replace(/^hyphen$/i, ''),
          profilingForm: yes(get(row, 'with profiling forn', 'with profiling form')),
          baptizedWater: yes(get(row, 'baptized in water')),
          baptizedHolyGhost: yes(get(row, 'baptized in holy ghost'))
        }
      });
    }
  }
  return { people: out, warnings };
}

function summarize(people) {
  const by = {};
  for (const p of people) {
    const d = (by[p.deptName] ||= { total: 0, status: {}, cellgroups: {} });
    d.total++;
    d.status[p.data.status] = (d.status[p.data.status] || 0) + 1;
    const cg = p.cellgroupName || '(none)';
    d.cellgroups[cg] = (d.cellgroups[cg] || 0) + 1;
  }
  return by;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const newOnly = args.includes('--new-only');
  const fileArg = args.find((a) => a.startsWith('--file='));
  const file = path.resolve(fileArg ? fileArg.slice(7) : path.join(__dirname, '..', 'data', 'masterlist.xlsx'));

  console.log(`📄  Reading ${file}`);
  const { people, warnings } = await parseMasterlist(file);
  console.log(`👥  Parsed ${people.length} people`);
  console.dir(summarize(people), { depth: 4 });
  if (warnings.length) { console.log(`⚠️   ${warnings.length} warning(s):`); warnings.forEach((w) => console.log('   - ' + w)); }
  if (dry && !newOnly) { console.log('\nDry run — nothing written.'); return; }

  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  const Department = require('../models/Department');
  const Cellgroup = require('../models/Cellgroup');
  const Member = require('../models/Member');

  await connectDB();

  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // "Already in the database" = same first + last name (any department, case-insensitive)
  const nameMatch = (d) => ({
    lastName: new RegExp(`^${esc(d.lastName)}$`, 'i'),
    firstName: new RegExp(`^${esc(d.firstName)}$`, 'i')
  });

  if (dry) { // --dry --new-only: read-only check against the database
    const fresh = [];
    let skippedCount = 0;
    for (const p of people) {
      if (await Member.exists(nameMatch(p.data))) skippedCount++;
      else fresh.push(p);
    }
    console.log(`\n🔎  Already in the database (would be skipped): ${skippedCount}`);
    console.log(`➕  New names (would be added): ${fresh.length}`);
    fresh.slice(0, 100).forEach((p) => console.log(`   + ${p.deptName}: ${p.data.lastName}, ${p.data.firstName} ${p.data.middleInitial} (${p.cellgroupName || 'no cellgroup'}, ${p.data.status})`));
    console.log('\nDry run — nothing written.');
    await mongoose.disconnect();
    return;
  }

  // Departments (match by slug; create only if missing)
  const depts = {};
  for (const cfg of SHEETS) {
    depts[cfg.slug] = (await Department.findOne({ slug: cfg.slug })) ||
      (await Department.create({ name: cfg.deptName, slug: cfg.slug }));
  }

  // Cellgroups (per department, case-insensitive name match; create if missing)
  const cgCache = new Map();
  const getCellgroup = async (slug, name) => {
    if (!name) return null;
    const key = `${slug}|${name.toLowerCase()}`;
    if (cgCache.has(key)) return cgCache.get(key);
    let cg = await Cellgroup.findOne({ department: depts[slug]._id, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!cg) cg = await Cellgroup.create({ name, department: depts[slug]._id });
    cgCache.set(key, cg);
    return cg;
  };

  // memberId counter — assigned here so a bulk run can't collide on the same millisecond
  let counter = 0;
  for (const m of await Member.find({ memberId: /^MEM-\d+$/ }, 'memberId')) {
    counter = Math.max(counter, parseInt(m.memberId.slice(4), 10) || 0);
  }

  const stats = { created: 0, updated: 0, skipped: 0, cellgroupsCreated: 0, failed: 0 };
  const cgBefore = await Cellgroup.countDocuments();
  const leaders = new Map(); // cellgroup id -> { leader, assistants:Set }

  for (const p of people) {
    try {
      // --new-only: anyone whose name is already in the database is left completely untouched
      if (newOnly && (await Member.exists(nameMatch(p.data)))) { stats.skipped++; continue; }

      const cg = await getCellgroup(p.slug, p.cellgroupName);
      const fullName = `${p.data.firstName} ${p.data.lastName}`;
      if (cg && ['Leader', 'Assistant Leader'].includes(p.data.cgPosition)) {
        const e = leaders.get(String(cg._id)) || { cg, leader: '', assistants: new Set() };
        if (p.data.cgPosition === 'Leader' && !e.leader) e.leader = fullName;
        if (p.data.cgPosition === 'Assistant Leader') e.assistants.add(fullName);
        leaders.set(String(cg._id), e);
      }

      const doc = { ...p.data, department: depts[p.slug]._id, cellgroup: cg ? cg._id : null };
      const match = {
        department: doc.department,
        lastName: new RegExp(`^${esc(doc.lastName)}$`, 'i'),
        firstName: new RegExp(`^${esc(doc.firstName)}$`, 'i'),
        middleInitial: doc.middleInitial
      };
      const existing = newOnly ? null : await Member.findOne(match);
      if (existing) { Object.assign(existing, doc); await existing.save(); stats.updated++; }
      else { await Member.create({ ...doc, memberId: `MEM-${String(++counter).padStart(5, '0')}` }); stats.created++; }
    } catch (err) {
      stats.failed++;
      console.error(`❌  ${p.sheet} row ${p.row} (${p.data.lastName}, ${p.data.firstName}): ${err.message}`);
    }
  }

  // Cellgroup leaders — fill only when the cellgroup has none yet, so manual edits survive re-runs
  for (const { cg, leader, assistants } of leaders.values()) {
    const fresh = await Cellgroup.findById(cg._id);
    if (!fresh.leaderName && leader) fresh.leaderName = leader;
    if (!fresh.assistantLeaders.length && assistants.size) fresh.assistantLeaders = [...assistants].slice(0, 20);
    await fresh.save();
  }

  stats.cellgroupsCreated = (await Cellgroup.countDocuments()) - cgBefore;
  console.log('\n✅  Import finished', stats);
  await mongoose.disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { parseMasterlist };