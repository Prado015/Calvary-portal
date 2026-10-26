const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/attendance', protect, ctrl.attendanceSummary);
router.get('/members', protect, ctrl.membersExport);
router.get('/visitors', protect, ctrl.visitorsExport);

module.exports = router;
