'use client';

import { useLocale } from '@/shared/i18n/locale-provider';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { getRestaurants } from '@/shared/api/restaurants';

export default function RestaurantsPage() {
  const { t } = useLocale();

  const {
    data: restaurants,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['restaurants'],
    queryFn: getRestaurants,
  });

  if (isLoading && !restaurants) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.restaurants.eyebrow}</p>
        <h1 className="section-title">{t.restaurants.title}</h1>
        <p className="section-text">{t.restaurants.loading}</p>
      </section>
    );
  }

  if (isError && !restaurants) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.restaurants.eyebrow}</p>
        <h1 className="section-title">{t.restaurants.title}</h1>
        <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
          {t.restaurants.failed}
        </p>
      </section>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <section className="content-panel">
        <p className="eyebrow">{t.restaurants.eyebrow}</p>
        <h1 className="section-title">{t.restaurants.title}</h1>
        <p className="section-text">{t.restaurants.empty}</p>
      </section>
    );
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">{t.restaurants.eyebrow}</p>
      <h1 className="section-title">{t.restaurants.title}</h1>
      <p className="section-text">{t.restaurants.description}</p>

      <div className="mt-6 grid gap-4">
        {restaurants.map((restaurant) => (
          <article
            key={restaurant.id}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="grid gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  {restaurant.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {restaurant.address}
                </p>
              </div>

              <div>
                <Link
                  href={`/restaurants/${restaurant.id}`}
                  className="secondary-button"
                >
                  {t.restaurants.openRestaurant}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
