import { Router } from 'express';
import ctrl from './controller.js';
import { requireAuth, requireRole, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate, idRule, eventRules } from '../../middlewares/validators.js';

const router = Router();
const editor = [requireAuth, requireRole('editor', 'admin')];

router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, idRule, validate, ctrl.getById);
router.post('/', ...editor, eventRules, validate, ctrl.create);
router.put('/:id', ...editor, idRule, eventRules, validate, ctrl.update);
router.delete('/:id', ...editor, idRule, validate, ctrl.remove);

export default router;
