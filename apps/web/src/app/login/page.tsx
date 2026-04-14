'use client';

import { useLocale } from '@/shared/i18n/locale-provider';
import {
  getAccessToken,
  removeAccessToken,
  setAccessToken,
} from '@/features/auth/lib/token-storage';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { getMe, login, logout } from '@/shared/api/auth';
import {
  createLoginSchema,
  type LoginFormValues,
} from '@/features/auth/model/login-schema';

export default function LoginPage() {
  const { t } = useLocale();

  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: {
      email: '',
      phone: '',
      password: '',
    },
  });

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = getAccessToken();

      if (!accessToken) {
        return;
      }

      try {
        const currentUser = await getMe(accessToken);

        setCurrentUserEmail(currentUser.email ?? '');
        setCurrentUserRole(currentUser.role);
      } catch {
        removeAccessToken();
        setCurrentUserEmail('');
        setCurrentUserRole('');
      }
    };

    void restoreSession();
  }, []);

  const getRoleLabel = (role: string) => {
    if (role === 'ADMIN') {
      return t.common.adminRole;
    }

    if (role === 'GUEST') {
      return t.common.guestRole;
    }

    return role;
  };

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

      const currentUser = await getMe(response.accessToken);

      setCurrentUserEmail(currentUser.email ?? '');
      setCurrentUserRole(currentUser.role);
      setSuccessMessage(
        `${t.auth.welcomeBack}, ${getRoleLabel(response.user.role).toLowerCase()}.`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        if (Array.isArray(message)) {
          setServerError(message.join(', '));
          return;
        }

        if (typeof message === 'string') {
          if (message === 'Invalid credentials') {
            setServerError(t.auth.invalidCredentials);
            return;
          }

          setServerError(message);
          return;
        }
      }

      setServerError(t.auth.loginFailed);
    }
  };

  const handleLogout = async () => {
    setServerError('');

    const accessToken = getAccessToken();

    try {
      if (accessToken) {
        await logout(accessToken);
      }
    } catch {
      setServerError(t.auth.logoutFailed);
    }

    removeAccessToken();
    setCurrentUserEmail('');
    setCurrentUserRole('');
    setSuccessMessage(t.auth.loggedOut);
  };

  return (
    <section className="content-panel">
      <p className="eyebrow">{t.auth.eyebrow}</p>
      <h1 className="section-title">{t.auth.loginTitle}</h1>
      <p className="section-text">{t.auth.loginDescription}</p>

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
            autoComplete="username"
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
            autoComplete="current-password"
            placeholder={t.auth.passwordPlaceholder}
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

        {currentUserEmail || currentUserRole ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,248,240,0.04)] px-4 py-4 text-sm text-[var(--foreground)]">
            <p>
              <strong>{t.auth.currentEmail}:</strong>{' '}
              {currentUserEmail || t.auth.noEmail}
            </p>
            <p>
              <strong>{t.auth.currentRole}:</strong>{' '}
              {getRoleLabel(currentUserRole)}
            </p>
          </div>
        ) : null}

        {currentUserEmail || currentUserRole ? (
          <button
            type="button"
            className="secondary-button mt-2 w-fit"
            onClick={handleLogout}
          >
            {t.auth.logout}
          </button>
        ) : null}

        <button
          type="submit"
          className="primary-button mt-2 w-fit disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? t.auth.loggingIn : t.auth.login}
        </button>
      </form>
    </section>
  );
}
