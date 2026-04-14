'use client';

import Link from 'next/link';

import { useLocale } from '@/shared/i18n/locale-provider';

export default function SiteHeaderNav() {
  const { locale, setAppLocale, t } = useLocale();

  return (
    <nav className="site-nav">
      <Link href="/restaurants">{t.nav.restaurants}</Link>
      <Link href="/bookings">{t.nav.myBookings}</Link>
      <Link href="/login">{t.nav.login}</Link>
      <Link href="/register">{t.nav.register}</Link>

      <button
        type="button"
        className="rounded-full border border-[var(--border)] bg-[rgba(255,248,240,0.04)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[rgba(255,240,224,0.2)] hover:bg-[rgba(255,248,240,0.08)]"
        onClick={() => setAppLocale(locale === 'ru' ? 'en' : 'ru')}
      >
        {locale.toUpperCase()}
      </button>
    </nav>
  );
}
