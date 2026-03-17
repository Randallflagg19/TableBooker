export type TableRow = {
  id: string;
  restaurant_id: string;
  code: string;
  capacity: number;
  kind: 'REGULAR' | 'SHARED';
  created_at: string;
  updated_at: string;
};
