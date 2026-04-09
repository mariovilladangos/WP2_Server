import prisma from '../config/prisma.js';

export const getBookReviews = async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    const reviews = await prisma.review.findMany({
      where: { bookId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: reviews });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    const userId = req.user.id;
    const { rating, comment } = req.body;

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    // Check user has a RETURNED loan for this book
    const completedLoan = await prisma.loan.findFirst({
      where: { userId, bookId, status: 'RETURNED' },
    });

    if (!completedLoan) {
      return res.status(403).json({
        error: true,
        message: 'Solo puedes reseñar libros que hayas devuelto',
      });
    }

    const review = await prisma.review.create({
      data: { userId, bookId, rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ data: review });
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = req.user.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ error: true, message: 'Reseña no encontrada' });
    }

    if (review.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para eliminar esta reseña' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: 'Reseña eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};
