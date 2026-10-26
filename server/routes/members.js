const router = require('express').Router();
const ctrl = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, ctrl.getMemberStats);
router.get('/', protect, ctrl.getMembers);
router.get('/:id', protect, ctrl.getMember);
router.post('/', protect, authorize('super_admin', 'head_usher', 'usher_secretary'), ctrl.createMember);
router.put('/:id', protect, authorize('super_admin', 'head_usher', 'usher_secretary'), ctrl.updateMember);
router.delete('/:id', protect, authorize('super_admin', 'head_usher'), ctrl.deleteMember);

module.exports = router;
