const router = require('express').Router();
const ctrl = require('../controllers/cellgroupController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, ctrl.getCellgroups);
router.post('/', protect, authorize('super_admin', 'head_usher'), ctrl.createCellgroup);
router.put('/:id', protect, authorize('super_admin', 'head_usher', 'usher_secretary'), ctrl.updateCellgroup);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteCellgroup);

module.exports = router;
