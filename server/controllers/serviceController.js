const Service = require('../models/Service');
const { log } = require('../utils/logger');

exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ serviceDate: -1 }).limit(50);
    res.json({ success: true, count: services.length, data: services });
  } catch (err) { next(err); }
};

exports.getTodayService = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const service = await Service.findOne({ serviceDate: today }).sort({ createdAt: -1 });
    res.json({ success: true, data: service || null });
  } catch (err) { next(err); }
};

exports.createService = async (req, res, next) => {
  try {
    const service = await Service.create({ ...req.body, createdBy: req.user._id });
    await log({ user: req.user, action: 'create', module: 'services', recordId: service._id, details: service.name });
    res.status(201).json({ success: true, data: service });
  } catch (err) { next(err); }
};
