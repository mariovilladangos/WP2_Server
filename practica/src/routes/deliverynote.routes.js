import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createDeliveryNote, listDeliveryNotes, getDeliveryNote,
  deleteDeliveryNote, signDeliveryNote, downloadPdf,
} from '../controllers/deliverynote.controller.js';
import { uploadImage, processSignatureImage } from '../middleware/upload.middleware.js';

const router = Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: DeliveryNotes
 *   description: Delivery note (albarán) management
 */

/**
 * @swagger
 * /api/deliverynote:
 *   post:
 *     summary: Create a delivery note (material or hours format)
 *     tags: [DeliveryNotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [format, client, project, workDate, material, quantity, unit]
 *                 properties:
 *                   format:      { type: string, enum: [material] }
 *                   client:      { type: string, description: 'Client ObjectId' }
 *                   project:     { type: string, description: 'Project ObjectId' }
 *                   description: { type: string }
 *                   workDate:    { type: string, format: date-time }
 *                   material:    { type: string, example: 'Cemento' }
 *                   quantity:    { type: number, example: 10 }
 *                   unit:        { type: string, example: 'sacos' }
 *               - type: object
 *                 required: [format, client, project, workDate]
 *                 properties:
 *                   format:      { type: string, enum: [hours] }
 *                   client:      { type: string }
 *                   project:     { type: string }
 *                   description: { type: string }
 *                   workDate:    { type: string, format: date-time }
 *                   hours:       { type: number }
 *                   workers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:  { type: string }
 *                         hours: { type: number }
 *     responses:
 *       201:
 *         description: Delivery note created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Client or project not found in your company
 */
router.post('/', createDeliveryNote);

/**
 * @swagger
 * /api/deliverynote:
 *   get:
 *     summary: List delivery notes with pagination and filters
 *     tags: [DeliveryNotes]
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
 *         name: project
 *         schema: { type: string }
 *         description: Filter by project ID
 *       - in: query
 *         name: client
 *         schema: { type: string }
 *         description: Filter by client ID
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [material, hours] }
 *       - in: query
 *         name: signed
 *         schema: { type: boolean }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: workDate >= from
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: workDate <= to
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: '-workDate' }
 *     responses:
 *       200:
 *         description: Paginated delivery notes (with populated client and project)
 */
router.get('/', listDeliveryNotes);

/**
 * @swagger
 * /api/deliverynote/pdf/{id}:
 *   get:
 *     summary: Download delivery note PDF (redirects to Cloudinary if signed, generated on the fly otherwise)
 *     tags: [DeliveryNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF generated on the fly
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       302:
 *         description: Redirect to signed PDF stored in Cloudinary
 *       404:
 *         description: Delivery note not found
 */
router.get('/pdf/:id', downloadPdf);

/**
 * @swagger
 * /api/deliverynote/{id}:
 *   get:
 *     summary: Get a single delivery note (populated user, client, project)
 *     tags: [DeliveryNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Delivery note data
 *       404:
 *         description: Not found
 */
router.get('/:id', getDeliveryNote);

/**
 * @swagger
 * /api/deliverynote/{id}/sign:
 *   patch:
 *     summary: Upload signature image, mark note as signed, generate PDF and store both in Cloudinary
 *     tags: [DeliveryNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [signature]
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: PNG / JPEG / WebP image (max 5 MB)
 *     responses:
 *       200:
 *         description: Delivery note signed (returns signatureUrl and pdfUrl)
 *       400:
 *         description: Missing image, invalid mimetype or already signed
 *       404:
 *         description: Delivery note not found
 */
router.patch('/:id/sign', uploadImage.single('signature'), processSignatureImage, signDeliveryNote);

/**
 * @swagger
 * /api/deliverynote/{id}:
 *   delete:
 *     summary: Soft-delete an unsigned delivery note (signed notes cannot be deleted)
 *     tags: [DeliveryNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Delivery note archived
 *       403:
 *         description: Signed delivery notes cannot be deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', deleteDeliveryNote);

export default router;