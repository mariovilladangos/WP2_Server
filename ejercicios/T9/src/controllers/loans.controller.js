import prisma from '../config/prisma.js';

export const getMyLoans = async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user.id },
      include: { book: { select: { id: true, title: true, author: true, isbn: true } } },
      orderBy: { loanDate: 'desc' },
    });

    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

export const getAllLoans = async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { loanDate: 'desc' },
    });

    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

export const createLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.body;

    // Check max 3 active loans
    const activeCount = await prisma.loan.count({
      where: { userId, status: 'ACTIVE' },
    });

    if (activeCount >= 3) {
      return res.status(400).json({
        error: true,
        message: 'No puedes tener más de 3 préstamos activos simultáneamente',
      });
    }

    // Check not already borrowing this book
    const existingLoan = await prisma.loan.findFirst({
      where: { userId, bookId, status: 'ACTIVE' },
    });

    if (existingLoan) {
      return res.status(400).json({
        error: true,
        message: 'Ya tienes este libro en préstamo activo',
      });
    }

    // Check availability
    const book = await prisma.book.findUnique({ where: { id: bookId } });

    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    if (book.available <= 0) {
      return res.status(400).json({
        error: true,
        message: 'No hay ejemplares disponibles de este libro',
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const [loan] = await prisma.$transaction([
      prisma.loan.create({
        data: { userId, bookId, dueDate, status: 'ACTIVE' },
        include: { book: { select: { id: true, title: true, author: true } } },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { available: { decrement: 1 } },
      }),
    ]);

    res.status(201).json({ data: loan });
  } catch (err) {
    next(err);
  }
};

export const returnLoan = async (req, res, next) => {
  try {
    const loanId = Number(req.params.id);
    const userId = req.user.id;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });

    if (!loan) {
      return res.status(404).json({ error: true, message: 'Préstamo no encontrado' });
    }

    if (loan.userId !== userId && !['LIBRARIAN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: true, message: 'No tienes permisos para devolver este préstamo' });
    }

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ error: true, message: 'Este préstamo ya fue devuelto' });
    }

    const [updatedLoan] = await prisma.$transaction([
      prisma.loan.update({
        where: { id: loanId },
        data: { status: 'RETURNED', returnDate: new Date() },
        include: { book: { select: { id: true, title: true, author: true } } },
      }),
      prisma.book.update({
        where: { id: loan.bookId },
        data: { available: { increment: 1 } },
      }),
    ]);

    res.json({ data: updatedLoan });
  } catch (err) {
    next(err);
  }
};
