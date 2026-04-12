import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.email('Invalid email format').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(30, 'Password must be less than or equal to 30 characters long'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Email or phone is required',
    path: ['email'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
