import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['USER', 'LIBRARIAN', 'ADMIN']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const bookSchema = z.object({
  isbn: z.string().min(1, 'El ISBN es requerido'),
  title: z.string().min(1, 'El título es requerido'),
  author: z.string().min(1, 'El autor es requerido'),
  genre: z.string().min(1, 'El género es requerido'),
  description: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()),
  copies: z.number().int().min(1, 'Debe haber al menos 1 ejemplar'),
});

export const updateBookSchema = bookSchema.partial();

export const loanSchema = z.object({
  bookId: z.number().int().positive('ID de libro inválido'),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'El rating mínimo es 1').max(5, 'El rating máximo es 5'),
  comment: z.string().optional(),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: true,
      message: 'Datos inválidos',
      details: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  req.body = result.data;
  next();
};
