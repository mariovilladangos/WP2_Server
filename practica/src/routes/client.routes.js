import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createClient, updateClient, listClients, listArchivedClients,
  getClient, deleteClient, restoreClient,
} from '../controllers/client.controller.js';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management
 */

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClient'
 *     responses:
 *       201:
 *         description: Client created
 *       400:
 *         description: Validation error
 *       409:
 *         description: CIF already exists
 */
router.post('/', createClient);

/**
 * @swagger
 * /api/client:
 *   get:
 *     summary: List clients (paginated, filterable)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: createdAt }
 *     responses:
 *       200:
 *         description: Paginated list of clients
 */
router.get('/', listClients);

/**
 * @swagger
 * /api/client/archived:
 *   get:
 *     summary: List archived clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archived clients list
 */
router.get('/archived', listArchivedClients);

/**
 * @swagger
 * /api/client/{id}:
 *   get:
 *     summary: Get a single client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client data
 *       404:
 *         description: Not found
 */
router.get('/:id', getClient);

/**
 * @swagger
 * /api/client/{id}:
 *   put:
 *     summary: Update a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClient'
 *     responses:
 *       200:
 *         description: Updated client
 *       404:
 *         description: Not found
 */
router.put('/:id', updateClient);

/**
 * @swagger
 * /api/client/{id}:
 *   delete:
 *     summary: Archive or hard-delete a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: soft
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Deleted/archived
 */
router.delete('/:id', deleteClient);

/**
 * @swagger
 * /api/client/{id}/restore:
 *   patch:
 *     summary: Restore an archived client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client restored
 */
router.patch('/:id/restore', restoreClient);

export default router;