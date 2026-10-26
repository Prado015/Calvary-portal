const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, ctrl.getStats);
router.get('/activity', protect, ctrl.getRecentActivity);

module.exports = router;
