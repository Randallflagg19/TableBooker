'use client';

import { useLocale } from '@/shared/i18n/locale-provider';

export default function SiteHeaderNav() {
  const { locale, setAppLocale, t } = useLocale();

  return (
    <nav className="site-nav">
      <a href="/restaurants">{t.nav.restaurants}</a>
      <a href="/bookings">{t.nav.myBookings}</a>
      <a href="/login">{t.nav.login}</a>
      <a href="/register">{t.nav.register}</a>

      <button
        type="button"
        className="rounded-full border border-[var(--border)] bg-[rgba(255,248,240,0.04)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[rgba(255,240,224,0.2)] hover:bg-[rgba(255,248,240,0.08)]"
        onClick={() => {
          setAppLocale(locale === 'ru' ? 'en' : 'ru');
          window.location.reload();
        }}
      >
        {locale.toUpperCase()}
      </button>
    </nav>
  );
}
