// Creates the built-in service types if they are missing, and links older
// untyped services to them by name. Safe to run on every start.
const ServiceType = require('../models/ServiceType');
const Service = require('../models/Service');
const Department = require('../models/Department');

const DEFAULTS = [
  { code: 'sunday',    name: 'Sunday Service',    kind: 'weekly', weekday: 0, color: 'gold',   sortOrder: 10, slugs: [],               legacy: /sunday/i },
  { code: 'wednesday', name: 'Wednesday Service', kind: 'weekly', weekday: 3, color: 'teal',   sortOrder: 20, slugs: [],               legacy: /wednesday/i },
  { code: 'friday',    name: 'Friday Service',    kind: 'weekly', weekday: 5, color: 'blue',   sortOrder: 30, slugs: ['youth'],        legacy: /friday/i },
  { code: 'prayer',    name: 'Prayer Meeting',    kind: 'custom', weekday: null, color: 'purple', sortOrder: 40, slugs: ['amm', 'lm'], legacy: /prayer/i }
];

async function ensureServiceTypes() {
  const created = [];
  for (const def of DEFAULTS) {
    let type = await ServiceType.findOne({ code: def.code });
    if (!type) {
      let departments = [];
      if (def.slugs.length) {
        const found = await Department.find({ slug: { $in: def.slugs } }, '_id');
        if (!found.length) continue; // ministry-specific type: wait until its ministries exist
        departments = found.map((d) => d._id);
      }
      try {
        type = await ServiceType.create({
          code: def.code, name: def.name, kind: def.kind, weekday: def.weekday,
          color: def.color, sortOrder: def.sortOrder, departments
        });
        created.push(def.name);
      } catch (err) {
        if (err.code === 11000) { console.warn(`Service type "${def.name}" already exists under another code — skipped.`); continue; }
        throw err;
      }
    }
    // Link older services (created before service types existed) by name.
    const legacy = await Service.find({ type: { $exists: false }, name: def.legacy });
    for (const s of legacy) {
      try { s.type = type._id; await s.save(); }
      catch (err) { if (err.code !== 11000) throw err; } // a typed twin already exists for that date
    }
  }
  return created;
}

module.exports = { ensureServiceTypes, DEFAULTS };
