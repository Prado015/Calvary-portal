const router = require('express').Router();
const ctrl = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, ctrl.getServices);
router.get('/today', protect, ctrl.getTodayService);
router.post('/', protect, authorize('super_admin', 'head_usher'), ctrl.createService);

module.exports = router;
