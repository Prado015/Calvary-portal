const router = require('express').Router();
const ctrl = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/public', ctrl.getPublicDepartments);
router.get('/by-slug/:slug', protect, ctrl.getDepartmentBySlug);
router.get('/', protect, ctrl.getDepartments);
router.post('/', protect, authorize('super_admin'), ctrl.createDepartment);
router.put('/:id', protect, authorize('super_admin'), ctrl.updateDepartment);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteDepartment);

module.exports = router;
