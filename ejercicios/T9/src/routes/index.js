import { Router } from 'express';
import authRoutes from './auth.routes.js';
import booksRoutes from './books.routes.js';
import loansRoutes from './loans.routes.js';
import reviewsRoutes from './reviews.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API Biblioteca Digital - T9',
    version: '1.0.0',
    docs: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      loans: '/api/loans',
      reviews: '/api/reviews',
      stats: '/api/stats',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/books', booksRoutes);
router.use('/loans', loansRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/stats', statsRoutes);

export default router;
