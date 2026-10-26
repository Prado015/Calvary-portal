const router = require('express').Router();
const ctrl = require('../controllers/memberAttendanceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, ctrl.getAttendanceForService);
router.get('/overview', protect, ctrl.getWeeklyOverview);
router.get('/by-cellgroup', protect, ctrl.getCellgroupBreakdown);
router.get('/history/:memberId', protect, ctrl.getMemberHistory);
router.post('/check-in', protect, authorize('super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff'), ctrl.checkIn);

module.exports = router;
