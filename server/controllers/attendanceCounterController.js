const AttendanceCounter = require('../models/AttendanceCounter');

const today = () => new Date().toISOString().split('T')[0];

exports.getCounter = async (req, res, next) => {
  try {
    const date = today();
    let counter = await AttendanceCounter.findOne({ date });
    if (!counter) counter = await AttendanceCounter.create({ date, members: 0, visitors: 0, children: 0, peak: 0 });
    res.json({ success: true, data: counter });
  } catch (err) { next(err); }
};

exports.incrementCounter = async (req, res, next) => {
  try {
    const { type, delta = 1 } = req.body;
    const allowed = ['members', 'visitors', 'children'];
    if (!allowed.includes(type)) return res.status(400).json({ success: false, message: 'type must be members | visitors | children' });

    const date = today();
    let counter = await AttendanceCounter.findOne({ date });
    if (!counter) counter = await AttendanceCounter.create({ date, members: 0, visitors: 0, children: 0, peak: 0 });

    counter[type] = Math.max(0, counter[type] + parseInt(delta));
    counter.peak = Math.max(counter.peak, counter.members + counter.visitors + counter.children);
    counter.updatedBy = req.user._id;
    await counter.save();
    req.io?.emit('counter:updated', counter);
    res.json({ success: true, data: counter });
  } catch (err) { next(err); }
};
