import { Router } from 'express';
import { upload } from './controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, requireRole('editor', 'admin'), upload);

export default router;
