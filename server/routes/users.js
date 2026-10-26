const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('super_admin'));
router.get('/', ctrl.getUsers);
router.post('/', ctrl.createUser);
router.put('/:id', ctrl.updateUser);

module.exports = router;
