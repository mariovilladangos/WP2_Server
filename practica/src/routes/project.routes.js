import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createProject, updateProject, listProjects, listArchivedProjects,
  getProject, deleteProject, restoreProject,
} from '../controllers/project.controller.js';

const router = Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: Create a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProject'
 *     responses:
 *       201:
 *         description: Project created
 *       409:
 *         description: Project code already exists
 */
router.post('/', createProject);

/**
 * @swagger
 * /api/project:
 *   get:
 *     summary: List projects with pagination and filters
 *     tags: [Projects]
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
 *         name: client
 *         schema: { type: string }
 *         description: Filter by client ID
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: '-createdAt' }
 *     responses:
 *       200:
 *         description: Paginated projects
 */
router.get('/', listProjects);

/**
 * @swagger
 * /api/project/archived:
 *   get:
 *     summary: List archived projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archived projects
 */
router.get('/archived', listArchivedProjects);

router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.patch('/:id/restore', restoreProject);

export default router;