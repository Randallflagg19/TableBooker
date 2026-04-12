'use client';

import { useBookingForm } from '@/features/bookings/model/use-booking-form';
import type { RestaurantTable } from '@/shared/api/restaurants';

type BookingFormProps = {
  tables: RestaurantTable[];
};

export default function BookingForm({ tables }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    successMessage,
    onSubmit,
    availableTimes,
    minDate,
  } = useBookingForm();

  return (
    <div className="mt-10 grid gap-5 rounded-[28px] border border-[var(--border)] bg-white/75 p-6 shadow-sm">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Create Booking
        </h2>
        <p className="text-sm leading-6 text-[var(--muted)]">
          Choose a table, date, start time, and guest count. Every booking lasts
          2 hours.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label
            htmlFor="tableId"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Table
          </label>
          <select
            id="tableId"
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('tableId')}
          >
            <option value="">Choose a table</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} · {table.capacity} guests · {table.kind}
              </option>
            ))}
          </select>
          {errors.tableId ? (
            <p className="text-sm text-red-700">{errors.tableId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="date"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Date
            </label>
            <input
              id="date"
              type="date"
              min={minDate}
              className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              {...register('date')}
            />
            {errors.date ? (
              <p className="text-sm text-red-700">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="time"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Start Time
            </label>
            <select
              id="time"
              className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              {...register('time')}
            >
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.time ? (
              <p className="text-sm text-red-700">{errors.time.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 md:max-w-48">
          <label
            htmlFor="guests"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Guests
          </label>
          <input
            id="guests"
            type="number"
            min={1}
            step={1}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('guests', { valueAsNumber: true })}
          />
          {errors.guests ? (
            <p className="text-sm text-red-700">{errors.guests.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="primary-button w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || availableTimes.length === 0}
        >
          {isSubmitting ? 'Creating booking...' : 'Create booking'}
        </button>
      </form>
    </div>
  );
}
