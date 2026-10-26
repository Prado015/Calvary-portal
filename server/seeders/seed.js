require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User       = require('../models/User');
const Department = require('../models/Department');
const Cellgroup  = require('../models/Cellgroup');
const Section    = require('../models/Section');
const { ensureServiceTypes } = require('../utils/ensureServiceTypes');

async function seed() {
  await connectDB();

  // ── Super admin — only seed if none exist ──────────────────
  const adminCount = await User.countDocuments({ role: 'super_admin' });
  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    await User.create({
      firstName: 'System', lastName: 'Admin', email: 'admin@calvarytabernacle.org',
      passwordHash, role: 'super_admin', status: 'active'
    });
    console.log('👤  Created super admin: admin@calvarytabernacle.org / ChangeMe123!');
  } else {
    console.log('👤  Skipped — super admin already exists');
  }

  // ── Departments (ministries) ────────────────────────────────
  const departmentCount = await Department.countDocuments();
  if (departmentCount === 0) {
    const departments = await Department.create([
      { name: 'Youth Ministry',     slug: 'youth' },
      { name: 'Ladies Ministries',  slug: 'lm' },
      { name: 'Adult Men Ministry', slug: 'amm' },
      { name: 'Children',           slug: 'children' },
      { name: 'Music Ministry',     slug: 'music' },
      { name: 'Sunday School',      slug: 'sunday-school' },
      { name: 'Prayer Ministry',    slug: 'prayer' },
      { name: 'Evangelism',         slug: 'evangelism' },
      { name: 'Couples',            slug: 'couples' },
      { name: 'Singles',            slug: 'singles' }
    ]);
    console.log(`⛪  Created ${departments.length} departments`);

    const youth = departments.find(d => d.slug === 'youth');
    await Cellgroup.create([
      { name: 'Faith Builders (Cell 1)',    department: youth._id },
      { name: 'Victory Youth (Cell 2)',     department: youth._id },
      { name: 'Next Gen (Cell 3)',          department: youth._id },
      { name: 'Chosen Generation (Cell 4)', department: youth._id },
      { name: 'Light Bearers (Cell 5)',     department: youth._id }
    ]);
    console.log('👥  Created 5 Youth cellgroups');

    // A sample Youth-portal login so you can see a scoped portal immediately.
    const youthPassHash = await bcrypt.hash('ChangeMe123!', 10);
    await User.create({
      firstName: 'John', lastName: 'Cruz', email: 'john.cruz@calvarytabernacle.org',
      passwordHash: youthPassHash, role: 'usher_secretary', department: youth._id
    });
    console.log('👤  Created Youth portal user: john.cruz@calvarytabernacle.org / ChangeMe123!');
  } else {
    console.log(`⛪  Skipped — ${departmentCount} department(s) already exist`);
  }

  // ── Service types (Sunday, Wednesday, Friday for Youth, Prayer Meeting for AMM/LM) ──
  const createdTypes = await ensureServiceTypes();
  console.log(createdTypes.length ? `🗓️  Created service types: ${createdTypes.join(', ')}` : '🗓️  Skipped — service types already exist');

  // ── Usher seating sections (not ministries — see models/Section.js) ──
  const sectionCount = await Section.countDocuments();
  if (sectionCount === 0) {
    await Section.create([
      { sectionName: 'Main Entrance Greeter' },
      { sectionName: 'Guiding Usher' },
      { sectionName: 'Assembling Chairs' },
      { sectionName: 'Parking Assistance' },
      { sectionName: 'Ushers Table' }
    ]);
    console.log('🪑  Created 5 usher sections');
  } else {
    console.log(`🪑  Skipped — ${sectionCount} section(s) already exist`);
  }

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
