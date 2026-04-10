import { Router } from 'express';
import {
  getRooms,
  createRoom,
  getMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
} from '../controllers/rooms.controller.js';
import checkSession from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Gestión de salas de chat
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Listar todas las salas
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de salas
 */
router.get('/', checkSession, getRooms);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Crear una nueva sala
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Sala creada
 *       409:
 *         description: Nombre ya en uso
 */
router.post('/', checkSession, createRoom);

/**
 * @swagger
 * /api/rooms/{id}/messages:
 *   get:
 *     summary: Obtener historial de mensajes de una sala
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         description: Término de búsqueda (bonus)
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de mensajes
 *       404:
 *         description: Sala no encontrada
 */
router.get('/:id/messages', checkSession, getMessages);

/**
 * @swagger
 * /api/rooms/{id}/messages/{msgId}:
 *   patch:
 *     summary: Editar un mensaje (bonus)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mensaje editado
 *       403:
 *         description: Sin permiso
 *       404:
 *         description: Mensaje no encontrado
 */
router.patch('/:id/messages/:msgId', checkSession, editMessage);

/**
 * @swagger
 * /api/rooms/{id}/messages/{msgId}:
 *   delete:
 *     summary: Eliminar un mensaje (bonus)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mensaje eliminado
 *       403:
 *         description: Sin permiso
 *       404:
 *         description: Mensaje no encontrado
 */
router.delete('/:id/messages/:msgId', checkSession, deleteMessage);

/**
 * @swagger
 * /api/rooms/{id}/messages/{msgId}/reactions:
 *   post:
 *     summary: Reaccionar a un mensaje con emoji (bonus)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emoji]
 *             properties:
 *               emoji:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reacciones actualizadas
 *       404:
 *         description: Mensaje no encontrado
 */
router.post('/:id/messages/:msgId/reactions', checkSession, reactToMessage);

export default router;
