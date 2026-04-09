import { Router } from 'express';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/books.controller.js';
import { getBookReviews, createReview } from '../controllers/reviews.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/role.middleware.js';
import { validate, bookSchema, updateBookSchema, reviewSchema } from '../schemas/validation.js';

const router = Router();

/**
 * @openapi
 * /api/books:
 *   get:
 *     tags: [Books]
 *     summary: Listar libros con filtros y paginación
 *     parameters:
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *         description: Buscar por título (parcial)
 *       - in: query
 *         name: author
 *         schema: { type: string }
 *         description: Buscar por autor (parcial)
 *       - in: query
 *         name: genre
 *         schema: { type: string }
 *         description: Filtrar por género
 *       - in: query
 *         name: available
 *         schema: { type: boolean }
 *         description: Solo libros con ejemplares disponibles
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Lista paginada de libros
 */
router.get('/', getBooks);

/**
 * @openapi
 * /api/books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Obtener libro por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Datos del libro
 *       404:
 *         description: Libro no encontrado
 */
router.get('/:id', getBookById);

/**
 * @openapi
 * /api/books:
 *   post:
 *     tags: [Books]
 *     summary: Crear libro (LIBRARIAN/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isbn, title, author, genre, publishedYear, copies]
 *             properties:
 *               isbn: { type: string }
 *               title: { type: string }
 *               author: { type: string }
 *               genre: { type: string }
 *               description: { type: string }
 *               publishedYear: { type: integer }
 *               copies: { type: integer }
 *     responses:
 *       201:
 *         description: Libro creado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.post('/', authMiddleware, checkRole('LIBRARIAN', 'ADMIN'), validate(bookSchema), createBook);

/**
 * @openapi
 * /api/books/{id}:
 *   put:
 *     tags: [Books]
 *     summary: Actualizar libro (LIBRARIAN/ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Libro actualizado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Libro no encontrado
 */
router.put('/:id', authMiddleware, checkRole('LIBRARIAN', 'ADMIN'), validate(updateBookSchema), updateBook);

/**
 * @openapi
 * /api/books/{id}:
 *   delete:
 *     tags: [Books]
 *     summary: Eliminar libro (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Libro eliminado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Libro no encontrado
 */
router.delete('/:id', authMiddleware, checkRole('ADMIN'), deleteBook);

/**
 * @openapi
 * /api/books/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Listar reseñas de un libro
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de reseñas
 *       404:
 *         description: Libro no encontrado
 */
router.get('/:id/reviews', getBookReviews);

/**
 * @openapi
 * /api/books/{id}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Crear reseña (requiere préstamo devuelto)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Reseña creada
 *       403:
 *         description: No has devuelto este libro
 *       409:
 *         description: Ya existe tu reseña para este libro
 */
router.post('/:id/reviews', authMiddleware, validate(reviewSchema), createReview);

export default router;
