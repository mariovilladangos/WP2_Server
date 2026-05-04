import { z } from 'zod';

const addressSchema = z.object({
  street:   z.string().optional().default(''),
  number:   z.string().optional().default(''),
  postal:   z.string().optional().default(''),
  city:     z.string().optional().default(''),
  province: z.string().optional().default(''),
}).optional().default({});

export const createClientSchema = z.object({
  name:    z.string().min(1, 'Name is required').trim(),
  cif:     z.string().min(1, 'CIF is required').trim().toUpperCase(),
  email:   z.string().email('Invalid email').optional().or(z.literal('')).default(''),
  phone:   z.string().optional().default(''),
  address: addressSchema,
});

export const updateClientSchema = createClientSchema.partial();