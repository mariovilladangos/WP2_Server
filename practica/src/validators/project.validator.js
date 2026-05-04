import { z } from 'zod';

const addressSchema = z.object({
  street:   z.string().optional().default(''),
  number:   z.string().optional().default(''),
  postal:   z.string().optional().default(''),
  city:     z.string().optional().default(''),
  province: z.string().optional().default(''),
}).optional().default({});

export const createProjectSchema = z.object({
  client:      z.string().min(1, 'Client ID is required'),
  name:        z.string().min(1, 'Name is required').trim(),
  projectCode: z.string().min(1, 'Project code is required').trim(),
  address:     addressSchema,
  email:       z.string().email().optional().or(z.literal('')).default(''),
  notes:       z.string().optional().default(''),
  active:      z.boolean().optional().default(true),
});

export const updateProjectSchema = createProjectSchema.partial();