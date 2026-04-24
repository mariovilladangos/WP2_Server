import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import podcastsRoutes from './podcasts.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: db });
});

router.use('/auth', authRoutes);
router.use('/podcasts', podcastsRoutes);

export default router;
