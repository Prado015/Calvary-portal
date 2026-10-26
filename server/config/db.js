const dns = require('dns');
const mongoose = require('mongoose');

// Some Windows / ISP / router DNS setups refuse the SRV lookup that
// mongodb+srv:// needs ("querySrv ECONNREFUSED"). Use public DNS for this
// process instead. Override with DNS_SERVERS=1.1.1.1,8.8.8.8 in .env if needed.
const servers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
  : ['8.8.8.8', '1.1.1.1'];
dns.setServers(servers);

module.exports = async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing. Check that server/.env exists and has MONGO_URI=...');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(err.message)) {
      console.error('Hint: this is a DNS/network problem. Try another network (phone hotspot), turn off VPN/antivirus web shield, or use the long "mongodb://" connection string from Atlas.');
    } else if (/bad auth|authentication failed/i.test(err.message)) {
      console.error('Hint: wrong database username or password in MONGO_URI (the Atlas database user, not your Atlas login).');
    } else if (/Server selection timed out|whitelist|IP/i.test(err.message)) {
      console.error('Hint: in Atlas, open Network Access and add your current IP address.');
    }
    process.exit(1);
  }
};