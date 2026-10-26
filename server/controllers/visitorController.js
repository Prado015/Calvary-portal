const Visitor = require('../models/Visitor');
const { log } = require('../utils/logger');

exports.getVisitors = async (req, res, next) => {
  try {
    const { date, firstTime, search, department } = req.query;
    const filter = {};
    if (date)       filter.date       = date;
    if (firstTime)  filter.firstTime  = firstTime;
    if (department) filter.department = department;
    if (search) filter.name = new RegExp(search, 'i');

    const visitors = await Visitor.find(filter).populate('cellgroup', 'name').populate('department', 'name slug').sort({ createdAt: -1 });
    res.json({ success: true, count: visitors.length, data: visitors });
  } catch (err) { next(err); }
};

exports.createVisitor = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const visitor = await Visitor.create({ ...req.body, date: req.body.date || today, registeredBy: req.user._id });
    await log({ user: req.user, action: 'create', module: 'visitors', recordId: visitor._id, details: visitor.name });
    req.io?.emit('visitors:updated', visitor);
    res.status(201).json({ success: true, data: visitor });
  } catch (err) { next(err); }
};

exports.updateVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    await log({ user: req.user, action: 'update', module: 'visitors', recordId: visitor._id });
    res.json({ success: true, data: visitor });
  } catch (err) { next(err); }
};

exports.deleteVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    await log({ user: req.user, action: 'delete', module: 'visitors', recordId: req.params.id });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};
