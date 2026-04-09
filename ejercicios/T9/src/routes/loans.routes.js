import { Router } from 'express';
import { getMyLoans, getAllLoans, createLoan, returnLoan } from '../controllers/loans.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/role.middleware.js';
import { validate, loanSchema } from '../schemas/validation.js';

const router = Router();

/**
 * @openapi
 * /api/loans:
 *   get:
 *     tags: [Loans]
 *     summary: Mis préstamos activos e histórico
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mis préstamos
 *       401:
 *         description: No autenticado
 */
router.get('/', authMiddleware, getMyLoans);

/**
 * @openapi
 * /api/loans/all:
 *   get:
 *     tags: [Loans]
 *     summary: Todos los préstamos (LIBRARIAN/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de préstamos
 *       403:
 *         description: Sin permisos
 */
router.get('/all', authMiddleware, checkRole('LIBRARIAN', 'ADMIN'), getAllLoans);

/**
 * @openapi
 * /api/loans:
 *   post:
 *     tags: [Loans]
 *     summary: Solicitar préstamo de un libro
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookId]
 *             properties:
 *               bookId: { type: integer }
 *     responses:
 *       201:
 *         description: Préstamo creado (14 días)
 *       400:
 *         description: Máximo 3 préstamos activos / ya tienes ese libro / sin ejemplares
 *       404:
 *         description: Libro no encontrado
 */
router.post('/', authMiddleware, validate(loanSchema), createLoan);

/**
 * @openapi
 * /api/loans/{id}/return:
 *   put:
 *     tags: [Loans]
 *     summary: Devolver un libro prestado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Libro devuelto, inventario actualizado
 *       400:
 *         description: Préstamo ya devuelto
 *       404:
 *         description: Préstamo no encontrado
 */
router.put('/:id/return', authMiddleware, returnLoan);

export default router;
