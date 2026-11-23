import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from './controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate, registerRules, idRule } from '../../middlewares/validators.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const updateRules = [
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'editor', 'viewer']).withMessage('Rol inválido'),
  body('password').optional().isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
];

router.get('/', ctrl.list);
router.post('/', registerRules, validate, ctrl.create);
router.get('/:id', idRule, validate, ctrl.getById);
router.put('/:id', idRule, updateRules, validate, ctrl.update);
router.delete('/:id', idRule, validate, ctrl.remove);

export default router;
