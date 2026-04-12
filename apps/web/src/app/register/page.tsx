'use client';

import { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { register as registerUser } from '@/shared/api/auth';
import {
  registerSchema,
  type RegisterFormValues,
} from '@/features/auth/model/register-schema';

export default function RegisterPage() {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError('');
    setSuccessMessage('');

    try {
      const payload = {
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.password,
      };

      const user = await registerUser(payload);

      setSuccessMessage(
        `Account created successfully for ${user.email ?? user.phone ?? 'new user'}.`,
      );
      reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        if (Array.isArray(message)) {
          setServerError(message.join(', '));
          return;
        }

        if (typeof message === 'string') {
          setServerError(message);
          return;
        }
      }

      setServerError('Registration failed. Please try again.');
    }
  };

  return (
    <section className="content-panel">
      <p className="eyebrow">Auth</p>
      <h1 className="section-title">Register</h1>
      <p className="section-text">
        Create a new account using email, phone, or both.
      </p>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="lex@example.com"
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-sm text-red-700">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="phone"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Phone
          </label>
          <input
            id="phone"
            type="text"
            autoComplete="tel"
            placeholder="+79991234567"
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('phone')}
          />
          {errors.phone ? (
            <p className="text-sm text-red-700">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-red-700">{errors.password.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="primary-button mt-2 w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </section>
  );
}
