const router = require('express').Router();
const ctrl = require('../controllers/memberAttendanceController');
const qr = require('../controllers/qrController');
const { protect, authorize } = require('../middleware/auth');

const mark = authorize('super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff');

router.get('/', protect, ctrl.getAttendanceForService);
router.get('/overview', protect, ctrl.getWeeklyOverview);
router.get('/by-cellgroup', protect, ctrl.getCellgroupBreakdown);
router.get('/history/:memberId', protect, ctrl.getMemberHistory);
router.post('/check-in', protect, mark, ctrl.checkIn);
router.post('/qr-check-in', protect, mark, qr.qrCheckIn);

module.exports = router;
