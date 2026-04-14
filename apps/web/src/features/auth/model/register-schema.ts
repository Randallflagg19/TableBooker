import { z } from 'zod';

import { messages, type Locale } from '@/shared/i18n/messages';

const PHONE_REGEX = /^\+7\d{10}$/;

export function createRegisterSchema(t: (typeof messages)[Locale]) {
  return z
    .object({
      email: z
        .email(t.auth.validation.invalidEmail)
        .optional()
        .or(z.literal('')),
      phone: z
        .string()
        .optional()
        .or(z.literal(''))
        .refine(
          (value) =>
            value === undefined || value === '' || PHONE_REGEX.test(value),
          {
            message: t.auth.validation.phoneInvalid,
          },
        ),
      password: z
        .string()
        .min(8, t.auth.validation.passwordMin)
        .max(30, t.auth.validation.passwordMax),
    })
    .refine((data) => Boolean(data.email || data.phone), {
      message: t.auth.validation.emailOrPhoneRequired,
      path: ['email'],
    });
}

export type RegisterFormValues = z.infer<
  ReturnType<typeof createRegisterSchema>
>;
