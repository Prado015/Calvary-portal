const router = require('express').Router();
const ctrl = require('../controllers/followupController');
const { protect, authorize } = require('../middleware/auth');

const manage = authorize('super_admin', 'head_usher', 'usher_secretary');

router.get('/', protect, ctrl.list);
router.get('/:memberId/logs', protect, ctrl.getLogs);
router.post('/:memberId/log', protect, manage, ctrl.addLog);

module.exports = router;
