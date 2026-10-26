const Usher = require('../models/Usher');
const { log } = require('../utils/logger');

exports.getUshers = async (req, res, next) => {
  try {
    const { status, department, search } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (department) filter.department = department;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { name: re }, { usherCode: re }, { phone: re }];
    }
    const ushers = await Usher.find(filter).sort({ firstName: 1 });
    res.json({ success: true, count: ushers.length, data: ushers });
  } catch (err) { next(err); }
};

exports.getActiveUshers = async (req, res, next) => {
  try {
    const ushers = await Usher.find({ status: 'Active' }).sort({ firstName: 1 });
    res.json({ success: true, count: ushers.length, data: ushers });
  } catch (err) { next(err); }
};

exports.getUsher = async (req, res, next) => {
  try {
    const usher = await Usher.findById(req.params.id);
    if (!usher) return res.status(404).json({ success: false, message: 'Usher not found' });
    res.json({ success: true, data: usher });
  } catch (err) { next(err); }
};

exports.createUsher = async (req, res, next) => {
  try {
    if (req.body.phone) {
      const exists = await Usher.findOne({ phone: req.body.phone.trim() });
      if (exists) return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }
    const usher = await Usher.create(req.body);
    await log({ user: req.user, action: 'create', module: 'ushers', recordId: usher._id, details: usher.name });
    req.io?.emit('ushers:updated', usher);
    res.status(201).json({ success: true, data: usher });
  } catch (err) { next(err); }
};

exports.updateUsher = async (req, res, next) => {
  try {
    if (req.body.firstName || req.body.lastName) {
      const current = await Usher.findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: 'Usher not found' });
      req.body.name = `${req.body.firstName || current.firstName} ${req.body.lastName || current.lastName}`;
    }
    const usher = await Usher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!usher) return res.status(404).json({ success: false, message: 'Usher not found' });
    await log({ user: req.user, action: 'update', module: 'ushers', recordId: usher._id });
    req.io?.emit('ushers:updated', usher);
    res.json({ success: true, data: usher });
  } catch (err) { next(err); }
};

exports.deleteUsher = async (req, res, next) => {
  try {
    const usher = await Usher.findByIdAndDelete(req.params.id);
    if (!usher) return res.status(404).json({ success: false, message: 'Usher not found' });
    await log({ user: req.user, action: 'delete', module: 'ushers', recordId: req.params.id });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
