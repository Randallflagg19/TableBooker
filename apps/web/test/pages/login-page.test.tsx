import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/login/page';
import { messages } from '@/shared/i18n/messages';

const mockLogin = vi.fn();
const mockGetMe = vi.fn();
const mockLogout = vi.fn();

const mockGetAccessToken = vi.fn();
const mockSetAccessToken = vi.fn();
const mockRemoveAccessToken = vi.fn();

vi.mock('@/shared/i18n/locale-provider', () => ({
  useLocale: () => ({
    locale: 'ru',
    setAppLocale: vi.fn(),
    t: messages.ru,
  }),
}));

vi.mock('@/shared/api/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock('@/features/auth/lib/token-storage', () => ({
  getAccessToken: () => mockGetAccessToken(),
  setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  removeAccessToken: () => mockRemoveAccessToken(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockGetMe.mockReset();
    mockLogout.mockReset();
    mockGetAccessToken.mockReset();
    mockSetAccessToken.mockReset();
    mockRemoveAccessToken.mockReset();

    mockGetAccessToken.mockReturnValue(null);
  });

  it('logs in with email and password', async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        role: 'GUEST',
      },
    });

    mockGetMe.mockResolvedValue({
      email: 'lex@example.com',
      role: 'GUEST',
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'lex@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'lex@example.com',
        phone: undefined,
        password: 'password123',
      });
    });

    expect(mockSetAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockGetMe).toHaveBeenCalledWith('access-token');

    expect(
      await screen.findByText('С возвращением, гость.'),
    ).toBeInTheDocument();
    expect(screen.getByText('lex@example.com')).toBeInTheDocument();
    expect(screen.getByText('ГОСТЬ')).toBeInTheDocument();
  });

  it('shows localized error for invalid credentials', async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValue(
      new AxiosError('Request failed', undefined, undefined, undefined, {
        data: { message: 'Invalid credentials' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as never,
      }),
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'lex@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(
      await screen.findByText('Неверный логин или пароль.'),
    ).toBeInTheDocument();
  });

  it('shows localized validation error for invalid phone', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Телефон'), '12345');
    await user.type(screen.getByLabelText('Пароль'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(
      await screen.findByText('Неверный формат телефона'),
    ).toBeInTheDocument();

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('restores current user from existing session', async () => {
    mockGetAccessToken.mockReturnValue('stored-token');
    mockGetMe.mockResolvedValue({
      email: 'stored@example.com',
      role: 'GUEST',
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('stored-token');
    });

    expect(await screen.findByText('stored@example.com')).toBeInTheDocument();
    expect(screen.getByText('ГОСТЬ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  });
});
