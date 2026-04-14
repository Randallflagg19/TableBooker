import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n/messages';
import { createLoginSchema } from '@/features/auth/model/login-schema';

describe('createLoginSchema', () => {
  const schema = createLoginSchema(messages.ru);

  it('accepts login with email and password when phone is empty', () => {
    const result = schema.safeParse({
      email: 'lex@example.com',
      phone: '',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('accepts login with phone and password when email is empty', () => {
    const result = schema.safeParse({
      email: '',
      phone: '+79991234567',
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
});
