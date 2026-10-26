const router = require('express').Router();
const ctrl = require('../controllers/visitorController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getVisitors);
router.post('/', protect, ctrl.createVisitor);
router.put('/:id', protect, ctrl.updateVisitor);
router.delete('/:id', protect, ctrl.deleteVisitor);

module.exports = router;
