const router = require('express').Router();
const ctrl = require('../controllers/serviceTypeController');
const { protect, authorize } = require('../middleware/auth');

const admin = authorize('super_admin', 'head_usher');

router.get('/', protect, ctrl.list);
router.post('/', protect, admin, ctrl.create);
router.put('/:id', protect, admin, ctrl.update);
router.delete('/:id', protect, admin, ctrl.remove);

module.exports = router;
