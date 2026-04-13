import { Router } from 'express';
import userRoutes from './user.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'BildyApp API',
    version: '1.0.0',
    endpoints: {
      users: '/api/user',
      docs: '/api-docs',
      health: '/health',
    },
  });
});

router.use('/user', userRoutes);

export default router;
