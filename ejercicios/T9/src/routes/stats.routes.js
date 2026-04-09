import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/role.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Estadísticas de la biblioteca (libros más prestados, mejor valorados, préstamos vencidos)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas completas
 *       403:
 *         description: Sin permisos
 */
router.get('/', authMiddleware, checkRole('LIBRARIAN', 'ADMIN'), getStats);

export default router;
