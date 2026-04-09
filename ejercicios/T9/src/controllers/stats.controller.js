import prisma from '../config/prisma.js';

export const getStats = async (req, res, next) => {
  try {
    // Run queries sequentially to stay within Session Pooler connection limits
    const topBorrowed = await prisma.book.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        _count: { select: { loans: true } },
      },
      orderBy: { loans: { _count: 'desc' } },
      take: 5,
    });

    const booksWithReviews = await prisma.book.findMany({
      where: { reviews: { some: {} } },
      select: {
        id: true,
        title: true,
        author: true,
        reviews: { select: { rating: true } },
      },
    });

    const overdueLoans = await prisma.loan.findMany({
      where: { status: 'ACTIVE', dueDate: { lt: new Date() } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true, author: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalUsers = await prisma.user.count();
    const totalBooks = await prisma.book.count();
    const activeLoans = await prisma.loan.count({ where: { status: 'ACTIVE' } });
    const returnedLoans = await prisma.loan.count({ where: { status: 'RETURNED' } });
    const totalReviews = await prisma.review.count();

    // Mark overdue loans
    if (overdueLoans.length > 0) {
      await prisma.loan.updateMany({
        where: { status: 'ACTIVE', dueDate: { lt: new Date() } },
        data: { status: 'OVERDUE' },
      });
    }

    const topRated = booksWithReviews
      .map((book) => {
        const avg = book.reviews.reduce((sum, r) => sum + r.rating, 0) / book.reviews.length;
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          avgRating: Math.round(avg * 10) / 10,
          reviewCount: book.reviews.length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);

    res.json({
      data: {
        summary: { totalUsers, totalBooks, activeLoans, returnedLoans, totalReviews },
        topBorrowed: topBorrowed.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          genre: b.genre,
          timesLoaned: b._count.loans,
        })),
        topRated,
        overdueLoans: overdueLoans.map((l) => ({
          loanId: l.id,
          user: l.user,
          book: l.book,
          dueDate: l.dueDate,
          daysOverdue: Math.floor((new Date() - new Date(l.dueDate)) / (1000 * 60 * 60 * 24)),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
