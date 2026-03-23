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
