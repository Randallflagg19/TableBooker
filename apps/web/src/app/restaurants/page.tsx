'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { getRestaurants } from '@/shared/api/restaurants';

export default function RestaurantsPage() {
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
        <p className="eyebrow">Browse</p>
        <h1 className="section-title">Restaurants</h1>
        <p className="section-text">Loading restaurants...</p>
      </section>
    );
  }

  if (isError && !restaurants) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Browse</p>
        <h1 className="section-title">Restaurants</h1>
        <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
          Failed to load restaurants.
        </p>
      </section>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Browse</p>
        <h1 className="section-title">Restaurants</h1>
        <p className="section-text">No restaurants available right now.</p>
      </section>
    );
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">Browse</p>
      <h1 className="section-title">Restaurants</h1>
      <p className="section-text">
        Choose a restaurant to view its details and available tables.
      </p>

      <div className="mt-6 grid gap-4">
        {restaurants.map((restaurant) => (
          <article
            key={restaurant.id}
            className="rounded-[24px] border border-[var(--border)] bg-white/70 p-5 shadow-sm"
          >
            <div className="grid gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
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
                  Open restaurant
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
