import { useEffect, useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

import { getValidAccessToken } from '@/features/auth/lib/auth-session';
import {
  bookingSchema,
  getAvailableBookingTimes,
  getInitialBookingValues,
  type BookingFormValues,
} from '@/features/bookings/model/booking-schema';
import { createBooking } from '@/shared/api/bookings';

type ApiErrorResponse = {
  message?: string | string[];
};

const BOOKING_DURATION_HOURS = 2;

function buildBookingDate(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function useBookingForm() {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const initialValues = getInitialBookingValues();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      tableId: '',
      date: initialValues.date,
      time: initialValues.time,
      guests: 2,
    },
  });

  const selectedDate = useWatch({
    control,
    name: 'date',
  });

  const selectedTime = useWatch({
    control,
    name: 'time',
  });

  const availableTimes = getAvailableBookingTimes(selectedDate);

  useEffect(() => {
    if (availableTimes.length === 0) {
      return;
    }

    if (!availableTimes.includes(selectedTime)) {
      setValue('time', availableTimes[0], {
        shouldValidate: true,
      });
    }
  }, [availableTimes, selectedTime, setValue]);

  const onSubmit = async (values: BookingFormValues) => {
    setServerError('');
    setSuccessMessage('');

    try {
      const accessToken = await getValidAccessToken();

      if (!accessToken) {
        setServerError('Session expired. Please log in again.');
        return;
      }

      const startAt = buildBookingDate(values.date, values.time);
      const endAt = new Date(
        startAt.getTime() + BOOKING_DURATION_HOURS * 60 * 60 * 1000,
      );

      const booking = await createBooking(
        {
          tableId: values.tableId,
          guests: values.guests,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
        accessToken,
      );
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      setSuccessMessage(`Booking created with status ${booking.status}.`);

      const nextInitialValues = getInitialBookingValues();

      reset({
        tableId: '',
        date: nextInitialValues.date,
        time: nextInitialValues.time,
        guests: 2,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | ApiErrorResponse
          | undefined;
        const message = responseData?.message;

        if (Array.isArray(message)) {
          setServerError(message.join(', '));
          return;
        }

        if (typeof message === 'string') {
          setServerError(message);
          return;
        }
      }

      setServerError('Failed to create booking.');
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    serverError,
    successMessage,
    onSubmit,
    availableTimes,
    minDate: initialValues.date,
  };
}
