import { Router } from 'express';
import authRoutes from './auth.routes.js';
import roomsRoutes from './rooms.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'T10 Chat API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      rooms: '/api/rooms',
      docs: '/api-docs',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/rooms', roomsRoutes);

export default router;
