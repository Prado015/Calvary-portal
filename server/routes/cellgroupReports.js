const router = require('express').Router();
const ctrl = require('../controllers/cellgroupReportController');
const { protect, authorize } = require('../middleware/auth');

// Anyone signed in can read their own ministry's report (scoped in the
// controller); only managers can change it.
const manage = authorize('super_admin', 'head_usher', 'usher_secretary');

router.put('/activities/:id', protect, manage, ctrl.updateActivity);
router.delete('/activities/:id', protect, manage, ctrl.deleteActivity);
router.get('/:cellgroupId', protect, ctrl.getReport);
router.post('/:cellgroupId/activities', protect, manage, ctrl.createActivity);
router.put('/:cellgroupId/funds', protect, manage, ctrl.saveFund);

module.exports = router;
