import prisma from '../config/prisma.js';

export const getBooks = async (req, res, next) => {
  try {
    const { title, author, genre, available, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(title && { title: { contains: title, mode: 'insensitive' } }),
      ...(author && { author: { contains: author, mode: 'insensitive' } }),
      ...(genre && { genre: { contains: genre, mode: 'insensitive' } }),
      ...(available === 'true' && { available: { gt: 0 } }),
    };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { title: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      data: books,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

export const getBookById = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        _count: { select: { reviews: true, loans: true } },
      },
    });

    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    res.json({ data: book });
  } catch (err) {
    next(err);
  }
};

export const createBook = async (req, res, next) => {
  try {
    const { isbn, title, author, genre, description, publishedYear, copies } = req.body;

    const book = await prisma.book.create({
      data: { isbn, title, author, genre, description, publishedYear, copies, available: copies },
    });

    res.status(201).json({ data: book });
  } catch (err) {
    next(err);
  }
};

export const updateBook = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.book.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    const { isbn, title, author, genre, description, publishedYear, copies } = req.body;

    // If copies changed, adjust available accordingly
    let available = existing.available;
    if (copies !== undefined) {
      const diff = copies - existing.copies;
      available = Math.max(0, existing.available + diff);
    }

    const book = await prisma.book.update({
      where: { id },
      data: { isbn, title, author, genre, description, publishedYear, copies, available },
    });

    res.json({ data: book });
  } catch (err) {
    next(err);
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.book.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    await prisma.book.delete({ where: { id } });
    res.json({ message: 'Libro eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};
