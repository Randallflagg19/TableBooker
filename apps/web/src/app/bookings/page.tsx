'use client';

import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getValidAccessToken } from '@/features/auth/lib/auth-session';
import {
  getAccessToken,
  getRefreshToken,
} from '@/features/auth/lib/token-storage';

import { getMyBookings } from '@/shared/api/bookings';

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
        <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
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
        <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
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
            className="rounded-[24px] border border-[var(--border)] bg-white/70 p-5 shadow-sm"
          >
            <div className="grid gap-2">
              <p className="text-sm text-[var(--muted)]">
                <strong>Статус:</strong> {booking.status}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Гости:</strong> {booking.guests}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Столик:</strong> {formatTableShortId(booking.table_id)}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Дата:</strong> {formatBookingDate(booking.start_at)}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>Время:</strong>{' '}
                {formatBookingTimeRange(booking.start_at, booking.end_at)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
