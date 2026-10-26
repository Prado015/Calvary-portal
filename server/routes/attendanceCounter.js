const router = require('express').Router();
const ctrl = require('../controllers/attendanceCounterController');
const { protect } = require('../middleware/auth');

router.get('/counter', protect, ctrl.getCounter);
router.post('/counter/increment', protect, ctrl.incrementCounter);

module.exports = router;
