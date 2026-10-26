const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.get('/me', protect, ctrl.getMe);
router.put('/password', protect, ctrl.changePassword);
// Admin-only — regular users don't self-register in a church management system.
router.post('/register', protect, authorize('super_admin'), ctrl.register);

module.exports = router;
