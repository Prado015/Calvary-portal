const router = require('express').Router();
const ctrl = require('../controllers/baptismController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, ctrl.getBaptisms);
router.post('/', protect, authorize('super_admin', 'head_usher'), ctrl.createBaptism);
router.put('/:id', protect, authorize('super_admin', 'head_usher'), ctrl.updateBaptism);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteBaptism);

module.exports = router;
