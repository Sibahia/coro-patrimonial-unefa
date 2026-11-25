import { Router } from 'express';
import {
  getMonuments,
  getMonumentById,
  createMonument,
  updateMonument,
  deleteMonument
} from './monument.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate, idRule, monumentRules } from '../../middlewares/validators.js';

const router = Router();
const editor = [requireAuth, requireRole('editor', 'admin')];

router.get('/', optionalAuth, getMonuments);
router.get('/:id', optionalAuth, idRule, validate, getMonumentById);
router.post('/', ...editor, monumentRules, validate, createMonument);
router.put('/:id', ...editor, idRule, monumentRules, validate, updateMonument);
router.delete('/:id', ...editor, idRule, validate, deleteMonument);

export default router;
