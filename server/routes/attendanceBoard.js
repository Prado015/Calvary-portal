const router = require('express').Router();
const ctrl = require('../controllers/attendanceBoardController');
const { protect, authorize } = require('../middleware/auth');

const mark = authorize('super_admin', 'head_usher', 'usher_secretary', 'usher', 'counter_staff');
const manage = authorize('super_admin', 'head_usher', 'usher_secretary');

router.get('/month', protect, ctrl.getMonth);
router.get('/member/:id', protect, ctrl.getMemberMonth);
router.put('/save', protect, mark, ctrl.save);
router.post('/occurrences', protect, manage, ctrl.addOccurrences);
router.delete('/occurrences/:id', protect, manage, ctrl.deleteOccurrence);

module.exports = router;
