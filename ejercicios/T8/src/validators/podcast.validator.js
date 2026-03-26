import { z } from 'zod';

export const createPodcastSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    category: z.enum(['tech', 'science', 'history', 'comedy', 'news']).optional(),
    duration: z.number().min(60, 'La duración mínima es 60 segundos').optional(),
    episodes: z.number().optional(),
    published: z.boolean().optional(),
  }),
});

export const updatePodcastSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    category: z.enum(['tech', 'science', 'history', 'comedy', 'news']).optional(),
    duration: z.number().min(60).optional(),
    episodes: z.number().optional(),
    published: z.boolean().optional(),
  }),
});
