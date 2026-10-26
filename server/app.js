const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Behind Render's proxy (and Vercel's rewrite) the real client IP arrives in X-Forwarded-For.
// Without this, rate limiting would treat every visitor as one IP.
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

// req.io is read dynamically from app settings (set via app.set('io', io) in
// server.js) rather than captured at middleware-registration time — this
// avoids an ordering bug where routes requiring app.js would otherwise be
// registered before io was ever attached.
app.use((req, res, next) => { req.io = app.get('io'); next(); });

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// Routes
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/departments',       require('./routes/departments'));
app.use('/api/cellgroups',        require('./routes/cellgroups'));
app.use('/api/cellgroup-reports', require('./routes/cellgroupReports'));
app.use('/api/members',           require('./routes/members'));
app.use('/api/member-attendance', require('./routes/memberAttendance'));
app.use('/api/attendance-board',  require('./routes/attendanceBoard'));
app.use('/api/service-types',     require('./routes/serviceTypes'));
app.use('/api/visitors',          require('./routes/visitors'));
app.use('/api/ushers',            require('./routes/ushers'));
app.use('/api/baptism',           require('./routes/baptism'));
app.use('/api/services',          require('./routes/services'));
app.use('/api/attendance',        require('./routes/attendanceCounter'));
app.use('/api/dashboard',         require('./routes/dashboard'));
app.use('/api/users',             require('./routes/users'));
app.use('/api/reports',           require('./routes/reports'));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use(errorHandler);

module.exports = app;