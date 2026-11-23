import { Router } from 'express';
import * as ctrl from './controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { authLimiter } from '../../middlewares/rateLimit.js';
import { validate, registerRules, loginRules } from '../../middlewares/validators.js';

const router = Router();

router.post('/register', requireAuth, requireRole('admin'), registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

export default router;
