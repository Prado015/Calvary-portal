const router = require('express').Router();
const ctrl = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');

// Public sign-up is limited harder than the rest of the API (10 requests / hour / IP).
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { success: false, message: 'Too many sign-up attempts. Please try again later.' } });

router.post('/login', ctrl.login);
router.post('/signup', signupLimiter, ctrl.signup);
router.get('/me', protect, ctrl.getMe);
router.put('/password', protect, ctrl.changePassword);
// Admin-only — regular users don't self-register in a church management system.
router.post('/register', protect, authorize('super_admin'), ctrl.register);

module.exports = router;