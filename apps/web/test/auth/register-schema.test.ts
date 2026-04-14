import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n/messages';
import { createRegisterSchema } from '@/features/auth/model/register-schema';

describe('createRegisterSchema', () => {
  const schema = createRegisterSchema(messages.ru);

  it('accepts registration with email and password when phone is empty', () => {
    const result = schema.safeParse({
      email: 'lex@example.com',
      phone: '',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('requires at least email or phone', () => {
    const result = schema.safeParse({
      email: '',
      phone: '',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.auth.validation.emailOrPhoneRequired,
      );
    }
  });

  it('rejects invalid phone when it is provided', () => {
    const result = schema.safeParse({
      email: '',
      phone: '12345',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.auth.validation.phoneInvalid,
      );
    }
  });

  it('rejects too short password', () => {
    const result = schema.safeParse({
      email: 'lex@example.com',
      phone: '',
      password: '123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.auth.validation.passwordMin,
      );
    }
  });

  it('rejects invalid email format', () => {
    const result = schema.safeParse({
      email: 'not-an-email',
      phone: '',
      password: 'password123',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.auth.validation.invalidEmail,
      );
    }
  });
});
