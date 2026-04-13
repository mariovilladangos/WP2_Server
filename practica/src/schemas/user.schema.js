import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const validationSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export const onboardingSchema = z.object({
  name:     z.string().min(1).transform((v) => v.trim()),
  lastName: z.string().min(1).transform((v) => v.trim()),
  NIF:      z.string().min(1).transform((v) => v.trim().toUpperCase()),
});

// Bonus: discriminatedUnion for freelance vs company onboarding
export const companyOnboardingSchema = z.discriminatedUnion('isFreelance', [
  z.object({
    isFreelance: z.literal(true),
    name: z.string().min(1).transform((v) => v.trim()),
    address: z.object({
      street:  z.string().optional().default(''),
      city:    z.string().optional().default(''),
      postal:  z.string().optional().default(''),
      country: z.string().optional().default(''),
    }).optional().default({}),
  }),
  z.object({
    isFreelance: z.literal(false),
    name: z.string().min(1).transform((v) => v.trim()),
    CIF: z.string().min(1).transform((v) => v.trim().toUpperCase()),
    address: z.object({
      street:  z.string().optional().default(''),
      city:    z.string().optional().default(''),
      postal:  z.string().optional().default(''),
      country: z.string().optional().default(''),
    }).optional().default({}),
  }),
]);

export const inviteSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name:     z.string().min(1).transform((v) => v.trim()).optional(),
  lastName: z.string().min(1).transform((v) => v.trim()).optional(),
});

// Bonus: change password with .refine() ensuring new !== current
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must be different from the current password',
  path: ['newPassword'],
});
