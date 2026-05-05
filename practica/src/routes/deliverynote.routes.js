import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createDeliveryNote, listDeliveryNotes, getDeliveryNote,
  deleteDeliveryNote, signDeliveryNote, downloadPdf,
} from '../controllers/deliverynote.controller.js';

const router = Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: DeliveryNotes
 *   description: Delivery note (albarán) management
 */

router.post('/', createDeliveryNote);
router.get('/', listDeliveryNotes);
router.get('/pdf/:id', downloadPdf);
router.get('/:id', getDeliveryNote);
router.patch('/:id/sign', signDeliveryNote);
router.delete('/:id', deleteDeliveryNote);

export default router;