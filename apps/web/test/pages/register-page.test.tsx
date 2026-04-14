import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from '@/app/register/page';
import { messages } from '@/shared/i18n/messages';

const mockRegisterUser = vi.fn();

vi.mock('@/shared/i18n/locale-provider', () => ({
  useLocale: () => ({
    locale: 'ru',
    setAppLocale: vi.fn(),
    t: messages.ru,
  }),
}));

vi.mock('@/shared/api/auth', () => ({
  register: (...args: unknown[]) => mockRegisterUser(...args),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    mockRegisterUser.mockReset();
  });

  it('submits registration with email and password when phone is empty', async () => {
    const user = userEvent.setup();

    mockRegisterUser.mockResolvedValue({
      email: 'lex@example.com',
      phone: null,
    });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Email'), 'lex@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(
      screen.getByRole('button', { name: 'Зарегистрироваться' }),
    );

    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({
        email: 'lex@example.com',
        phone: undefined,
        password: 'password123',
      });
    });

    expect(
      screen.getByText('Аккаунт успешно создан для lex@example.com.'),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Телефон')).toHaveValue('');
    expect(screen.getByLabelText('Пароль')).toHaveValue('');
  });

  it('shows localized error for duplicate email', async () => {
    const user = userEvent.setup();

    mockRegisterUser.mockRejectedValue(
      new AxiosError('Request failed', undefined, undefined, undefined, {
        data: { message: 'User with this email already exists' },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
      }),
    );

    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Email'), 'lex@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(
      screen.getByRole('button', { name: 'Зарегистрироваться' }),
    );

    expect(
      await screen.findByText('Пользователь с таким email уже существует.'),
    ).toBeInTheDocument();
  });

  it('shows localized error for duplicate phone', async () => {
    const user = userEvent.setup();

    mockRegisterUser.mockRejectedValue(
      new AxiosError('Request failed', undefined, undefined, undefined, {
        data: { message: 'User with this phone already exists' },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
      }),
    );

    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Телефон'), '+79991234567');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(
      screen.getByRole('button', { name: 'Зарегистрироваться' }),
    );

    expect(
      await screen.findByText('Пользователь с таким телефоном уже существует.'),
    ).toBeInTheDocument();
  });

  it('shows localized validation error for invalid phone', async () => {
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText('Телефон'), '12345');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(
      screen.getByRole('button', { name: 'Зарегистрироваться' }),
    );

    expect(
      await screen.findByText('Неверный формат телефона'),
    ).toBeInTheDocument();

    expect(mockRegisterUser).not.toHaveBeenCalled();
  });
});
