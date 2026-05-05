import { z } from 'zod';

const workerSchema = z.object({
  name:  z.string().min(1),
  hours: z.number().min(0),
});

export const createDeliveryNoteSchema = z.discriminatedUnion('format', [
  z.object({
    format:      z.literal('material'),
    client:      z.string().min(1, 'Client ID required'),
    project:     z.string().min(1, 'Project ID required'),
    description: z.string().optional().default(''),
    workDate:    z.string().or(z.date()),
    material:    z.string().min(1, 'Material is required for this format'),
    quantity:    z.number().min(0),
    unit:        z.string().min(1, 'Unit is required'),
  }),
  z.object({
    format:      z.literal('hours'),
    client:      z.string().min(1, 'Client ID required'),
    project:     z.string().min(1, 'Project ID required'),
    description: z.string().optional().default(''),
    workDate:    z.string().or(z.date()),
    hours:       z.number().min(0).optional().default(0),
    workers:     z.array(workerSchema).optional().default([]),
  }),
]);