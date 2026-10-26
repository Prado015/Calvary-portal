require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const app = require('./app');
const Service = require('./models/Service');
const MemberAttendance = require('./models/MemberAttendance');
const { ensureServiceTypes } = require('./utils/ensureServiceTypes');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_ORIGIN } });

// Controllers access this via req.io (see app.js) to emit real-time events.
app.set('io', io);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  try {
    // Attendance is now unique per member PER SERVICE (was per date). syncIndexes drops
    // the old index and builds the new ones; ensureServiceTypes adds Sunday/Wednesday/
    // Friday/Prayer Meeting if they are missing. Both are safe to run on every start.
    await Service.syncIndexes();
    await MemberAttendance.syncIndexes();
    const created = await ensureServiceTypes();
    if (created.length) console.log(`Created service types: ${created.join(', ')}`);
  } catch (err) {
    console.error('Startup data check failed (the server will still run):', err.message);
  }
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
