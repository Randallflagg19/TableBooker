'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
  getRestaurantById,
  getRestaurantTables,
} from '@/shared/api/restaurants';

export default function RestaurantPage() {
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

  const {
    data: tables,
    isLoading: isTablesLoading,
    isError: isTablesError,
  } = useQuery({
    queryKey: ['restaurant-tables', id],
    queryFn: () => getRestaurantTables(id),
    enabled: Boolean(id),
  });

  if ((isRestaurantLoading && !restaurant) || (isTablesLoading && !tables)) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Browse</p>
        <h1 className="section-title">Restaurant</h1>
        <p className="section-text">Loading restaurant details...</p>
      </section>
    );
  }

  if (
    (isRestaurantError && !restaurant) ||
    (!restaurant && !isRestaurantLoading)
  ) {
    return (
      <section className="content-panel">
        <p className="eyebrow">Browse</p>
        <h1 className="section-title">Restaurant</h1>
        <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
          Failed to load restaurant details.
        </p>
      </section>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <section className="content-panel">
      <p className="eyebrow">Browse</p>
      <h1 className="section-title">{restaurant.name}</h1>
      <p className="section-text">{restaurant.address}</p>

      <div className="mt-8 grid gap-4">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Tables
        </h2>

        {!tables || tables.length === 0 ? (
          <p className="section-text">
            No tables available for this restaurant.
          </p>
        ) : (
          <div className="grid gap-4">
            {tables.map((table) => (
              <article
                key={table.id}
                className="rounded-[24px] border border-[var(--border)] bg-white/70 p-5 shadow-sm"
              >
                <div className="grid gap-2">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">
                    {table.name}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">
                    Capacity: {table.capacity}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Type: {table.kind}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
