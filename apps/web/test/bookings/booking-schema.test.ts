import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n/messages';
import {
  BOOKING_TIME_OPTIONS,
  createBookingSchema,
  formatDateInputValue,
  getAvailableBookingTimes,
  getInitialBookingValues,
} from '@/features/bookings/model/booking-schema';

describe('booking-schema', () => {
  const schema = createBookingSchema(messages.ru);

  it('formats date to yyyy-mm-dd', () => {
    const date = new Date(2026, 3, 14);

    expect(formatDateInputValue(date)).toBe('2026-04-14');
  });

  it('returns all booking time options for a future date', () => {
    const result = getAvailableBookingTimes('2099-04-14');

    expect(result).toEqual([...BOOKING_TIME_OPTIONS]);
  });

  it('returns only future time options for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 14, 15, 30));

    const today = formatDateInputValue(new Date());
    const result = getAvailableBookingTimes(today);

    expect(result).toEqual([
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
    ]);

    vi.useRealTimers();
  });

  it('builds initial booking values for today when future slots exist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 14, 11, 15));

    const result = getInitialBookingValues();

    expect(result).toEqual({
      date: '2026-04-14',
      time: '12:00',
    });

    vi.useRealTimers();
  });

  it('moves initial booking values to tomorrow when today has no slots left', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 14, 22, 30));

    const result = getInitialBookingValues();

    expect(result).toEqual({
      date: '2026-04-15',
      time: '10:00',
    });

    vi.useRealTimers();
  });

  it('accepts valid booking data', () => {
    const result = schema.safeParse({
      tableId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2099-04-14',
      time: '12:00',
      guests: 2,
    });

    expect(result.success).toBe(true);
  });

  it('rejects booking without table id', () => {
    const result = schema.safeParse({
      tableId: '',
      date: '2099-04-14',
      time: '12:00',
      guests: 2,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.bookingForm.validation.chooseTable,
      );
    }
  });

  it('rejects booking with guests less than one', () => {
    const result = schema.safeParse({
      tableId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2099-04-14',
      time: '12:00',
      guests: 0,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.bookingForm.validation.guestsMin,
      );
    }
  });

  it('rejects booking time in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 14, 15, 30));

    const result = schema.safeParse({
      tableId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-04-14',
      time: '14:00',
      guests: 2,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        messages.ru.bookingForm.validation.futureTime,
      );
    }

    vi.useRealTimers();
  });
});
