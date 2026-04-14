'use client';

import { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useLocale } from '@/shared/i18n/locale-provider';
import { register as registerUser } from '@/shared/api/auth';
import {
  createRegisterSchema,
  type RegisterFormValues,
} from '@/features/auth/model/register-schema';

export default function RegisterPage() {
  const { t } = useLocale();

  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterSchema(t)),
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
        `${t.auth.registerSuccess} ${user.email ?? user.phone ?? 'new user'}.`,
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
          if (message === 'User with this email already exists') {
            setServerError(t.auth.emailAlreadyExists);
            return;
          }

          if (message === 'User with this phone already exists') {
            setServerError(t.auth.phoneAlreadyExists);
            return;
          }

          setServerError(message);
          return;
        }
      }

      setServerError(t.auth.registerFailed);
    }
  };

  return (
    <section className="content-panel">
      <p className="eyebrow">{t.auth.eyebrow}</p>
      <h1 className="section-title">{t.auth.registerTitle}</h1>
      <p className="section-text">{t.auth.registerDescription}</p>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {t.auth.email}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition placeholder:text-[rgba(184,171,157,0.7)] focus:border-[var(--accent)]"
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-sm text-[#f2c0b8]">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="phone"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {t.auth.phone}
          </label>
          <input
            id="phone"
            type="text"
            autoComplete="tel"
            placeholder={t.auth.phonePlaceholder}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition placeholder:text-[rgba(184,171,157,0.7)] focus:border-[var(--accent)]"
            {...register('phone')}
          />
          {errors.phone ? (
            <p className="text-sm text-[#f2c0b8]">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {t.auth.password}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t.auth.newPasswordPlaceholder}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.05)] px-4 text-[var(--foreground)] outline-none transition placeholder:text-[rgba(184,171,157,0.7)] focus:border-[var(--accent)]"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-[#f2c0b8]">{errors.password.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <p className="rounded-2xl border border-[rgba(201,107,99,0.28)] bg-[rgba(201,107,99,0.14)] px-4 py-3 text-sm text-[#f2c0b8]">
            {serverError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-[rgba(127,163,124,0.28)] bg-[rgba(127,163,124,0.14)] px-4 py-3 text-sm text-[#cfe3cd]">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="primary-button mt-2 w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? t.auth.creatingAccount : t.auth.register}
        </button>
      </form>
    </section>
  );
}
