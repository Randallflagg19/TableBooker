import { useEffect, useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/shared/i18n/locale-provider';

import { getValidAccessToken } from '@/features/auth/lib/auth-session';
import {
  createBookingSchema,
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
  const { t } = useLocale();

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
    resolver: zodResolver(createBookingSchema(t)),
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
        setServerError(t.bookingForm.sessionExpired);
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

      setSuccessMessage(
        `${t.bookingForm.createdWithStatus} ${t.bookingForm.status[booking.status]}.`,
      );

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
          if (
            message === 'This table is already booked for the selected time' ||
            message === 'Table is already booked for this time'
          ) {
            setServerError(t.bookingForm.tableAlreadyBooked);
            return;
          }

          setServerError(message);
          return;
        }
      }

      setServerError(t.bookingForm.createFailed);
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
