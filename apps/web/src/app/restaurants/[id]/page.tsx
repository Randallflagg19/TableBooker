'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useLocale } from '@/shared/i18n/locale-provider';
import BookingForm from '@/features/bookings/ui/booking-form';
import {
  getRestaurantById,
  getRestaurantTables,
} from '@/shared/api/restaurants';

export default function RestaurantPage() {
  const { t } = useLocale();

  const params = useParams();
  const id = params.id as string;

  const {
    data: restaurant,
    isLoading: isRestaurantLoading,
    isError: isRestaurantError,
  } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurantById(id),
    enabled: Boolean(id),
  });

  const { data: tables, isLoading: isTablesLoading } = useQuery({
    queryKey: ['restaurant-tables', id],
    queryFn: () => getRestaurantTables(id),
    enabled: Boolean(id),
  });

  const getTableKindLabel = (kind: string) => {
    if (kind === 'REGULAR') {
      return t.common.regular;
    }

    if (kind === 'SHARED') {
      return t.common.shared;
    }

    return kind;
  };

  if ((isRestaurantLoading && !restaurant) || (isTablesLoading && !tables)) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.restaurants.eyebrow}</p>
        <h1 className="section-title">{t.restaurants.restaurantTitle}</h1>
        <p className="section-text">{t.restaurants.loadingDetails}</p>
      </section>
    );
  }

  if (
    (isRestaurantError && !restaurant) ||
    (!restaurant && !isRestaurantLoading)
  ) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.restaurants.eyebrow}</p>
        <h1 className="section-title">{t.restaurants.restaurantTitle}</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          {t.restaurants.failedDetails}
        </p>
      </section>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">{t.restaurants.eyebrow}</p>
      <h1 className="section-title">{restaurant.name}</h1>
      <p className="section-text">{restaurant.address}</p>

      <div className="mt-8 grid gap-4">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          {t.restaurants.tables}
        </h2>

        {!tables || tables.length === 0 ? (
          <p className="section-text">{t.restaurants.noTables}</p>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <article
                key={table.id}
                className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,248,240,0.04)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
              >
                <div className="grid gap-2">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">
                    {table.name}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    {t.restaurants.capacity}: {table.capacity}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {t.restaurants.type}: {getTableKindLabel(table.kind)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {tables && tables.length > 0 ? <BookingForm tables={tables} /> : null}
    </section>
  );
}
