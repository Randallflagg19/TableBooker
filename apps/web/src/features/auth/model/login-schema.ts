import { z } from 'zod';

import { messages, type Locale } from '@/shared/i18n/messages';

const PHONE_REGEX = /^\+7\d{10}$/;

export function createLoginSchema(t: (typeof messages)[Locale]) {
  return z
    .object({
      email: z
        .email(t.auth.validation.invalidEmail)
        .optional()
        .or(z.literal('')),
      phone: z.string().optional().or(z.literal('')),
      password: z
        .string()
        .min(8, t.auth.validation.passwordMin)
        .max(30, t.auth.validation.passwordMax),
    })
    .superRefine((data, ctx) => {
      if (!data.email && !data.phone) {
        ctx.addIssue({
          code: 'custom',
          message: t.auth.validation.emailOrPhoneRequired,
          path: ['email'],
        });
      }

      if (data.phone && data.phone !== '' && !PHONE_REGEX.test(data.phone)) {
        ctx.addIssue({
          code: 'custom',
          message: t.auth.validation.phoneInvalid,
          path: ['phone'],
        });
      }
    });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
