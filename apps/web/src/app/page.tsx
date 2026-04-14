'use client';
import Link from 'next/link';
import { useLocale } from '@/shared/i18n/locale-provider';

export default function Home() {
  const { t } = useLocale();
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">TableBooker</p>
        <h1>{t.home.title}</h1>
        <p className="hero-text">{t.home.description}</p>
      </div>

      <div className="hero-actions">
        <Link href="/restaurants" className="primary-button">
          {t.home.exploreRestaurants}
        </Link>
        <Link href="/bookings" className="secondary-button">
          {t.home.myBookings}
        </Link>
        <Link href="/login" className="ghost-link">
          {t.home.loginOrRegister}
        </Link>
      </div>
    </section>
  );
}
