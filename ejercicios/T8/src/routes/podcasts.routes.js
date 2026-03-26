import { Router } from 'express';
import {
  getPublishedPodcasts,
  getAllPodcasts,
  getPodcastById,
  createPodcast,
  updatePodcast,
  deletePodcast,
  togglePublish,
} from '../controllers/podcasts.controller.js';
import checkSession from '../middleware/session.middleware.js';
import checkRol from '../middleware/rol.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createPodcastSchema, updatePodcastSchema } from '../validators/podcast.validator.js';

const router = Router();

/**
 * @openapi
 * /api/podcasts:
 *   get:
 *     tags:
 *       - Podcasts
 *     summary: Listar podcasts publicados (público)
 *     responses:
 *       200:
 *         description: Array de podcasts publicados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Podcast'
 */
router.get('/', getPublishedPodcasts);

/**
 * @openapi
 * /api/podcasts/admin/all:
 *   get:
 *     tags:
 *       - Podcasts
 *     summary: Listar todos los podcasts, incluidos no publicados (solo admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todos los podcasts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Podcast'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/admin/all', checkSession, checkRol('admin'), getAllPodcasts);

/**
 * @openapi
 * /api/podcasts/{id}:
 *   get:
 *     tags:
 *       - Podcasts
 *     summary: Obtener un podcast por ID (público)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del podcast (MongoDB ObjectId)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Podcast encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Podcast'
 *       404:
 *         description: Podcast no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getPodcastById);

/**
 * @openapi
 * /api/podcasts:
 *   post:
 *     tags:
 *       - Podcasts
 *     summary: Crear un nuevo podcast (requiere autenticación)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 example: Tech Talk Weekly
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 example: Un podcast semanal sobre tecnología
 *               category:
 *                 type: string
 *                 enum: [tech, science, history, comedy, news]
 *               duration:
 *                 type: number
 *                 minimum: 60
 *                 example: 3600
 *               episodes:
 *                 type: number
 *                 example: 1
 *     responses:
 *       201:
 *         description: Podcast creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Podcast'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/', checkSession, validate(createPodcastSchema), createPodcast);

/**
 * @openapi
 * /api/podcasts/{id}:
 *   put:
 *     tags:
 *       - Podcasts
 *     summary: Actualizar un podcast (requiere ser el autor)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Podcast actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Podcast'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: No eres el autor de este podcast
 *       404:
 *         description: Podcast no encontrado
 */
router.put('/:id', checkSession, validate(updatePodcastSchema), updatePodcast);

/**
 * @openapi
 * /api/podcasts/{id}:
 *   delete:
 *     tags:
 *       - Podcasts
 *     summary: Eliminar un podcast (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Podcast eliminado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Podcast no encontrado
 */
router.delete('/:id', checkSession, checkRol('admin'), deletePodcast);

/**
 * @openapi
 * /api/podcasts/{id}/publish:
 *   patch:
 *     tags:
 *       - Podcasts
 *     summary: Publicar o despublicar un podcast (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado de publicación cambiado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Podcast'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch('/:id/publish', checkSession, checkRol('admin'), togglePublish);

export default router;
