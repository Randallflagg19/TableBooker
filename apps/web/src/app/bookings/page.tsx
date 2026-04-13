'use client';

import { useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getValidAccessToken } from '@/features/auth/lib/auth-session';
import {
  getAccessToken,
  getRefreshToken,
} from '@/features/auth/lib/token-storage';

import {
  cancelBooking,
  confirmBooking,
  getMyBookings,
} from '@/shared/api/bookings';

function formatBookingDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('ru-RU');
}

function formatBookingTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const startTime = start.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTime = end.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${startTime} - ${endTime}`;
}

function formatTableShortId(tableId: string) {
  return `#${tableId.slice(0, 8)}`;
}

function subscribe() {
  return () => {};
}

function getServerSnapshot(): string | undefined {
  return undefined;
}

function getClientSnapshot(): string {
  const accessToken = getAccessToken() ?? '';
  const refreshToken = getRefreshToken() ?? '';

  return `${accessToken}::${refreshToken}`;
}

export default function BookingsPage() {
  const authSnapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [rawAccessToken = '', rawRefreshToken = ''] =
    authSnapshot?.split('::') ?? [];

  const accessToken = rawAccessToken || null;
  const refreshToken = rawRefreshToken || null;
  const hasSession = Boolean(accessToken || refreshToken);
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-bookings', accessToken, refreshToken],
    queryFn: async () => {
      const validAccessToken = await getValidAccessToken();

      if (!validAccessToken) {
        throw new Error('Unauthorized');
      }

      return getMyBookings(validAccessToken);
    },
    enabled: hasSession,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (bookingId: string) => confirmBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  if (authSnapshot === undefined) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Bookings</p>
        <h1 className="section-title">My Bookings</h1>
        <p className="section-text">Loading your bookings...</p>
      </section>
    );
  }

  if (!hasSession) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Bookings</p>
        <h1 className="section-title">My Bookings</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          Please log in to view your bookings.
        </p>
      </section>
    );
  }

  if (isLoading && !bookings) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Bookings</p>
        <h1 className="section-title">My Bookings</h1>
        <p className="section-text">Loading your bookings...</p>
      </section>
    );
  }

  if (isError && !bookings) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Bookings</p>
        <h1 className="section-title">My Bookings</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          Failed to load your bookings.
        </p>
      </section>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Bookings</p>
        <h1 className="section-title">My Bookings</h1>
        <p className="section-text">You have no bookings yet.</p>
      </section>
    );
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">Bookings</p>
      <h1 className="section-title">My Bookings</h1>
      <p className="section-text">
        Review your created bookings and their current status.
      </p>

      <div className="mt-6 grid gap-4">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Бронь
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                  {booking.status}
                </span>
              </div>

              <p className="text-base font-semibold text-[var(--foreground)]">
                {formatBookingTimeRange(booking.start_at, booking.end_at)}
              </p>

              <p className="text-sm text-[var(--muted)]">
                <strong>Дата:</strong> {formatBookingDate(booking.start_at)}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Гости:</strong> {booking.guests}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Столик:</strong> {formatTableShortId(booking.table_id)}
              </p>

              {booking.status === 'HOLD' || booking.status === 'CONFIRMED' ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {booking.status === 'HOLD' ? (
                    <button
                      type="button"
                      className="secondary-button disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => confirmMutation.mutate(booking.id)}
                      disabled={
                        confirmMutation.isPending || cancelMutation.isPending
                      }
                    >
                      {confirmMutation.isPending
                        ? 'Подтверждение...'
                        : 'Подтвердить'}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="secondary-button disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => cancelMutation.mutate(booking.id)}
                    disabled={
                      confirmMutation.isPending || cancelMutation.isPending
                    }
                  >
                    {cancelMutation.isPending ? 'Отмена...' : 'Отменить'}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
