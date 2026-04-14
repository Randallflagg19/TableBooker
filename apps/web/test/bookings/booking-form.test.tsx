import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BookingForm from '@/features/bookings/ui/booking-form';
import { messages } from '@/shared/i18n/messages';

const mockGetValidAccessToken = vi.fn();
const mockCreateBooking = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@/shared/i18n/locale-provider', () => ({
  useLocale: () => ({
    locale: 'ru',
    setAppLocale: vi.fn(),
    t: messages.ru,
  }),
}));

vi.mock('@/features/auth/lib/auth-session', () => ({
  getValidAccessToken: () => mockGetValidAccessToken(),
}));

vi.mock('@/shared/api/bookings', () => ({
  createBooking: (...args: unknown[]) => mockCreateBooking(...args),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    }),
  };
});

describe('BookingForm', () => {
  beforeEach(() => {
    mockGetValidAccessToken.mockReset();
    mockCreateBooking.mockReset();
    mockInvalidateQueries.mockReset();
  });

  const tables = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      restaurant_id: 'restaurant-id',
      name: 'Table 1',
      capacity: 2,
      kind: 'REGULAR' as const,
      created_at: '2026-04-14T00:00:00.000Z',
      updated_at: '2026-04-14T00:00:00.000Z',
    },
  ];

  it('shows validation error when table is not selected', async () => {
    const user = userEvent.setup();

    render(<BookingForm tables={tables} />);

    await user.click(
      screen.getByRole('button', { name: 'Создать бронирование' }),
    );

    expect(
      await screen.findByText('Пожалуйста, выберите столик'),
    ).toBeInTheDocument();

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('shows session expired error when there is no valid access token', async () => {
    const user = userEvent.setup();

    mockGetValidAccessToken.mockResolvedValue(null);

    render(<BookingForm tables={tables} />);

    await user.selectOptions(
      screen.getByLabelText('Столик'),
      '550e8400-e29b-41d4-a716-446655440000',
    );

    await user.click(
      screen.getByRole('button', { name: 'Создать бронирование' }),
    );

    expect(
      await screen.findByText('Сессия истекла. Пожалуйста, войдите снова.'),
    ).toBeInTheDocument();

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('creates booking successfully and resets table selection', async () => {
    const user = userEvent.setup();

    mockGetValidAccessToken.mockResolvedValue('access-token');
    mockCreateBooking.mockResolvedValue({
      id: 'booking-id',
      table_id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: 'user-id',
      guests: 2,
      start_at: '2026-04-14T09:00:00.000Z',
      end_at: '2026-04-14T11:00:00.000Z',
      status: 'HOLD',
      created_at: '2026-04-14T00:00:00.000Z',
      updated_at: '2026-04-14T00:00:00.000Z',
    });

    render(<BookingForm tables={tables} />);

    await user.selectOptions(
      screen.getByLabelText('Столик'),
      '550e8400-e29b-41d4-a716-446655440000',
    );

    await user.click(
      screen.getByRole('button', { name: 'Создать бронирование' }),
    );

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: '550e8400-e29b-41d4-a716-446655440000',
          guests: 2,
          startAt: expect.any(String),
          endAt: expect.any(String),
        }),
        'access-token',
      );
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['my-bookings'],
    });

    expect(
      await screen.findByText(
        'Бронирование создано со статусом НА ПОДТВЕРЖДЕНИИ.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Столик')).toHaveValue('');
    expect(screen.getByLabelText('Гости')).toHaveValue(2);
  });

  it('shows backend error message when booking request fails', async () => {
    const user = userEvent.setup();

    mockGetValidAccessToken.mockResolvedValue('access-token');
    mockCreateBooking.mockRejectedValue(
      new AxiosError('Request failed', undefined, undefined, undefined, {
        data: { message: 'Table is already booked for this time' },
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
      }),
    );

    render(<BookingForm tables={tables} />);

    await user.selectOptions(
      screen.getByLabelText('Столик'),
      '550e8400-e29b-41d4-a716-446655440000',
    );

    await user.click(
      screen.getByRole('button', { name: 'Создать бронирование' }),
    );

    expect(
      await screen.findByText('Этот столик уже занят на выбранное время.'),
    ).toBeInTheDocument();
  });
});
