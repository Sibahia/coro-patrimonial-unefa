import { Router } from 'express';
import ctrl from './controller.js';
import { requireAuth, requireRole, optionalAuth } from '../../middlewares/auth.js';
import { validate, idRule, heritageRules } from '../../middlewares/validators.js';

const router = Router();
const editor = [requireAuth, requireRole('editor', 'admin')];

router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, idRule, validate, ctrl.getById);
router.post('/', ...editor, heritageRules, validate, ctrl.create);
router.put('/:id', ...editor, idRule, heritageRules, validate, ctrl.update);
router.delete('/:id', ...editor, idRule, validate, ctrl.remove);

export default router;
