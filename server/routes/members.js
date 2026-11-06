const router = require('express').Router();
const ctrl = require('../controllers/memberController');
const qr = require('../controllers/qrController');
const { protect, authorize } = require('../middleware/auth');

const manage = authorize('super_admin', 'head_usher', 'usher_secretary');

router.get('/stats', protect, ctrl.getMemberStats);
router.get('/qr-cards', protect, qr.qrCards);
router.get('/', protect, ctrl.getMembers);

// Photos: the GET is protected by an unguessable signature in the link instead of a login header, so <img> tags work.
router.get('/:id/photo', ctrl.getPhoto);
router.put('/:id/photo', protect, manage, ctrl.uploadPhoto);
router.delete('/:id/photo', protect, manage, ctrl.deletePhoto);

router.get('/:id', protect, ctrl.getMember);
router.post('/', protect, manage, ctrl.createMember);
router.put('/:id', protect, manage, ctrl.updateMember);
router.delete('/:id', protect, authorize('super_admin', 'head_usher'), ctrl.deleteMember);

module.exports = router;
