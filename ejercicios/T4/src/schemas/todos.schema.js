import { z } from 'zod';

export const createTodosSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'El título no puede estar vacío')
      .max(100, 'El título no puede exceder 100 caracteres'),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low'])
  })
});

export const updateTodosSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional()
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID debe ser numérico')
  })
});