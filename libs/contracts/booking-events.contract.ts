export const BOOKING_EVENTS_EXCHANGE = 'booking.events';

export const BOOKING_CONFIRMED_EVENT = 'booking.confirmed';
export const BOOKING_CANCELLED_EVENT = 'booking.cancelled';

export type BookingEventPayload = {
  bookingId: string;
  userId: string;
  tableId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  startAt: string;
  endAt: string;
  email: string | null;
  phone: string | null;
};
