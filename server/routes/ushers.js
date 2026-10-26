const router = require('express').Router();
const ctrl = require('../controllers/usherController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, ctrl.getUshers);
router.get('/active', protect, ctrl.getActiveUshers);
router.get('/:id', protect, ctrl.getUsher);
router.post('/', protect, authorize('super_admin', 'head_usher'), ctrl.createUsher);
router.put('/:id', protect, authorize('super_admin', 'head_usher'), ctrl.updateUsher);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteUsher);

module.exports = router;
