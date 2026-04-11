import { bookingApi } from './client';

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
};

export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  name: string;
  capacity: number;
  kind: 'REGULAR' | 'SHARED';
  created_at: string;
  updated_at: string;
};

export async function getRestaurants(): Promise<Restaurant[]> {
  const response = await bookingApi.get<Restaurant[]>('/restaurants');
  return response.data;
}

export async function getRestaurantById(id: string): Promise<Restaurant> {
  const response = await bookingApi.get<Restaurant>(`/restaurants/${id}`);
  return response.data;
}

export async function getRestaurantTables(
  restaurantId: string,
): Promise<RestaurantTable[]> {
  const response = await bookingApi.get<RestaurantTable[]>(
    `/restaurants/${restaurantId}/tables`,
  );

  return response.data;
}
