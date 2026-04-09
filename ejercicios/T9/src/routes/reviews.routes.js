import { Router } from 'express';
import { deleteReview } from '../controllers/reviews.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Eliminar mi reseña
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reseña eliminada
 *       403:
 *         description: No eres el autor de esta reseña
 *       404:
 *         description: Reseña no encontrada
 */
router.delete('/:id', authMiddleware, deleteReview);

export default router;
