import { bookingApi } from './client';

export type CreateBookingPayload = {
  tableId: string;
  guests: number;
  startAt: string;
  endAt: string;
};

export type Booking = {
  id: string;
  table_id: string;
  user_id: string;
  guests: number;
  start_at: string;
  end_at: string;
  status: 'HOLD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
};

export async function createBooking(
  payload: CreateBookingPayload,
  accessToken: string,
): Promise<Booking> {
  const response = await bookingApi.post<Booking>('/bookings', payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

export async function getMyBookings(accessToken: string): Promise<Booking[]> {
  const response = await bookingApi.get<Booking[]>('/bookings/my', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}
