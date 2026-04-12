import { z } from 'zod';

export const BOOKING_TIME_OPTIONS = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
] as const;

function buildLocalStartAt(dateValue: string, timeValue: string): Date | null {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getAvailableBookingTimes(dateValue: string) {
  const now = new Date();
  const todayValue = formatDateInputValue(now);

  if (dateValue !== todayValue) {
    return [...BOOKING_TIME_OPTIONS];
  }

  return BOOKING_TIME_OPTIONS.filter((timeValue) => {
    const startAt = buildLocalStartAt(dateValue, timeValue);
    return startAt && startAt > now;
  });
}

export function getInitialBookingValues() {
  const now = new Date();
  const todayValue = formatDateInputValue(now);
  const todayTimes = getAvailableBookingTimes(todayValue);

  if (todayTimes.length > 0) {
    return {
      date: todayValue,
      time: todayTimes[0],
    };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  return {
    date: formatDateInputValue(tomorrow),
    time: BOOKING_TIME_OPTIONS[0],
  };
}

export const bookingSchema = z
  .object({
    tableId: z.uuid('Please choose a table'),
    date: z.string().min(1, 'Date is required'),
    time: z.enum(BOOKING_TIME_OPTIONS, {
      message: 'Please choose a start time',
    }),
    guests: z
      .number()
      .int('Guests must be a whole number')
      .min(1, 'Guests must be at least 1'),
  })
  .superRefine((data, ctx) => {
    const startAt = buildLocalStartAt(data.date, data.time);

    if (!startAt || Number.isNaN(startAt.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please choose a valid date and time',
        path: ['date'],
      });
      return;
    }

    if (startAt <= new Date()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Booking time must be in the future',
        path: ['time'],
      });
    }
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;
export type BookingTimeOption = (typeof BOOKING_TIME_OPTIONS)[number];
