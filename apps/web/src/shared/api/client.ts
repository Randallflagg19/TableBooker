import axios from 'axios';

const authBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_URL;
const bookingBaseUrl = process.env.NEXT_PUBLIC_BOOKING_API_URL;

if (!authBaseUrl) {
  throw new Error('NEXT_PUBLIC_AUTH_API_URL is not defined');
}

if (!bookingBaseUrl) {
  throw new Error('NEXT_PUBLIC_BOOKING_API_URL is not defined');
}

export const authApi = axios.create({
  baseURL: authBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const bookingApi = axios.create({
  baseURL: bookingBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
