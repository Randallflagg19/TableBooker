'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useLocale } from '@/shared/i18n/locale-provider';
import { getValidAccessToken } from '@/features/auth/lib/auth-session';
import { getAccessToken } from '@/features/auth/lib/token-storage';

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
  return getAccessToken() ?? '';
}

export default function BookingsPage() {
  const { t } = useLocale();

  const authSnapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const accessToken = authSnapshot || null;
  const hasSession = Boolean(accessToken);
  const [isCheckingSession, setIsCheckingSession] = useState(!accessToken);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkSession = async () => {
      if (accessToken) {
        setIsCheckingSession(false);
        return;
      }

      const restoredAccessToken = await getValidAccessToken();

      if (restoredAccessToken) {
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      }

      setIsCheckingSession(false);
    };

    void checkSession();
  }, [accessToken, queryClient]);

  const {
    data: bookings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-bookings', accessToken],
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

  if (authSnapshot === undefined || isCheckingSession) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.bookings.eyebrow}</p>
        <h1 className="section-title">{t.bookings.title}</h1>
        <p className="section-text">{t.bookings.loading}</p>
      </section>
    );
  }

  if (!hasSession) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.bookings.eyebrow}</p>
        <h1 className="section-title">{t.bookings.title}</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          {t.bookings.unauthorized}
        </p>
      </section>
    );
  }

  if (isLoading && !bookings) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.bookings.eyebrow}</p>
        <h1 className="section-title">{t.bookings.title}</h1>
        <p className="section-text">{t.bookings.loading}</p>
      </section>
    );
  }

  if (isError && !bookings) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.bookings.eyebrow}</p>
        <h1 className="section-title">{t.bookings.title}</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          {t.bookings.failed}
        </p>
      </section>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.bookings.eyebrow}</p>
        <h1 className="section-title">{t.bookings.title}</h1>
        <p className="section-text">{t.bookings.empty}</p>
      </section>
    );
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">{t.bookings.eyebrow}</p>
      <h1 className="section-title">{t.bookings.title}</h1>
      <p className="section-text">{t.bookings.description}</p>

      <div className="mt-6 grid gap-4">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {t.bookings.bookingLabel}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                  {t.bookings.status[booking.status]}
                </span>
              </div>

              <p className="text-base font-semibold text-[var(--foreground)]">
                {formatBookingTimeRange(booking.start_at, booking.end_at)}
              </p>

              <p className="text-sm text-[var(--muted)]">
                <strong>{t.bookings.date}:</strong>{' '}
                {formatBookingDate(booking.start_at)}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>{t.bookings.guests}:</strong> {booking.guests}
              </p>
              <p className="text-sm text-[var(--muted)]">
                <strong>{t.bookings.table}:</strong>{' '}
                {formatTableShortId(booking.table_id)}
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
                        ? t.bookings.confirming
                        : t.bookings.confirm}
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
                    {cancelMutation.isPending
                      ? t.bookings.cancelling
                      : t.bookings.cancel}
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
