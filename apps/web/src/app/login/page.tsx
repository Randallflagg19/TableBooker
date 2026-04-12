'use client';

import {
  removeAccessToken,
  setAccessToken,
  setRefreshToken,
  removeRefreshToken,
} from '@/features/auth/lib/token-storage';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { getMe, login } from '@/shared/api/auth';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/model/login-schema';

export default function LoginPage() {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    setSuccessMessage('');
    setCurrentUserEmail('');
    setCurrentUserRole('');

    try {
      const payload = {
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.password,
      };

      const response = await login(payload);

      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);

      const currentUser = await getMe(response.accessToken);

      setCurrentUserEmail(currentUser.email ?? '');
      setCurrentUserRole(currentUser.role);
      setSuccessMessage(`Welcome back, ${response.user.role.toLowerCase()}.`);
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

      setServerError('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    removeAccessToken();
    removeRefreshToken();
    setCurrentUserEmail('');
    setCurrentUserRole('');
    setSuccessMessage('');
    setServerError('');

    setSuccessMessage('You have logged out.');
  };

  return (
    <section className="content-panel">
      <p className="eyebrow">Auth</p>
      <h1 className="section-title">Login</h1>
      <p className="section-text">
        Use email or phone together with your password to enter the app.
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
            placeholder="Your password"
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

        {currentUserEmail || currentUserRole ? (
          <div className="rounded-2xl bg-white/70 px-4 py-4 text-sm text-[var(--foreground)]">
            <p>
              <strong>Email:</strong> {currentUserEmail || 'No email'}
            </p>
            <p>
              <strong>Role:</strong> {currentUserRole}
            </p>
          </div>
        ) : null}

        {currentUserEmail || currentUserRole ? (
          <button
            type="button"
            className="secondary-button mt-2 w-fit"
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : null}

        <button
          type="submit"
          className="primary-button mt-2 w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </section>
  );
}
