const WaterBaptism = require('../models/WaterBaptism');
const { log } = require('../utils/logger');

exports.getBaptisms = async (req, res, next) => {
  try {
    const { search, from, to } = req.query;
    const filter = {};
    if (from || to) filter.baptismDate = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ firstName: re }, { lastName: re }];
    }
    const records = await WaterBaptism.find(filter).sort({ baptismDate: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (err) { next(err); }
};

exports.createBaptism = async (req, res, next) => {
  try {
    const record = await WaterBaptism.create({ ...req.body, encodedBy: req.user._id });
    await log({ user: req.user, action: 'create', module: 'baptism', recordId: record._id, details: `${record.firstName} ${record.lastName}` });
    req.io?.emit('reportSubmitted', { module: 'baptism', record });
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

exports.updateBaptism = async (req, res, next) => {
  try {
    const record = await WaterBaptism.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    await log({ user: req.user, action: 'update', module: 'baptism', recordId: record._id });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

exports.deleteBaptism = async (req, res, next) => {
  try {
    const record = await WaterBaptism.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    await log({ user: req.user, action: 'delete', module: 'baptism', recordId: req.params.id });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
