const router = require('express').Router();
const ctrl = require('../controllers/notifyController');
const { protect, authorize } = require('../middleware/auth');

const manage = authorize('super_admin', 'head_usher', 'usher_secretary');

router.get('/status', protect, ctrl.status);
router.get('/log', protect, manage, ctrl.getLog);
router.post('/send', protect, manage, ctrl.send);
// Called by an outside scheduler once a day; protected by the CRON_KEY header instead of a login.
router.post('/run-daily', ctrl.runDaily);

module.exports = router;
