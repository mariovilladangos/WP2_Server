import { Router } from 'express';
import todosRoutes from './todos.routes.js';

const router = Router();

router.use('/todos', todosRoutes);

router.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Cursos v1.0',
    endpoints: {
      cursos: '/api/todos',
      health: '/health'
    }
  });
});

export default router;