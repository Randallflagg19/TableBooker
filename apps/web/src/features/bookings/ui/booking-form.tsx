'use client';

import { useLocale } from '@/shared/i18n/locale-provider';
import { useBookingForm } from '@/features/bookings/model/use-booking-form';
import type { RestaurantTable } from '@/shared/api/restaurants';

type BookingFormProps = {
  tables: RestaurantTable[];
};

export default function BookingForm({ tables }: BookingFormProps) {
  const { t } = useLocale();

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
    <div className="mt-10 grid gap-5 rounded-[28px] border border-[var(--border)] bg-[rgba(255,248,240,0.04)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          {t.bookingForm.title}
        </h2>
        <p className="text-sm leading-6 text-[var(--muted)]">
          {t.bookingForm.description}
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label
            htmlFor="tableId"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {t.bookingForm.table}
          </label>
          <select
            id="tableId"
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('tableId')}
          >
            <option value="">{t.bookingForm.chooseTable}</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} · {table.capacity} guests · {table.kind}
              </option>
            ))}
          </select>
          {errors.tableId ? (
            <p className="text-sm text-[#f2c0b8]">{errors.tableId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="date"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {t.bookingForm.date}
            </label>
            <input
              id="date"
              type="date"
              min={minDate}
              className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              {...register('date')}
            />
            {errors.date ? (
              <p className="text-sm text-[#f2c0b8]">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="time"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {t.bookingForm.startTime}
            </label>
            <select
              id="time"
              className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              {...register('time')}
            >
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.time ? (
              <p className="text-sm text-[#f2c0b8]">{errors.time.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 md:max-w-48">
          <label
            htmlFor="guests"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {t.bookingForm.guests}
          </label>
          <input
            id="guests"
            type="number"
            min={1}
            step={1}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('guests', { valueAsNumber: true })}
          />
          {errors.guests ? (
            <p className="text-sm text-[#f2c0b8]">{errors.guests.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
            {serverError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-[rgba(127,163,124,0.28)] bg-[rgba(127,163,124,0.14)] px-4 py-3 text-sm text-[#cfe3cd]">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="primary-button w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || availableTimes.length === 0}
        >
          {isSubmitting ? t.bookingForm.submitting : t.bookingForm.submit}
        </button>
      </form>
    </div>
  );
}
