import Link from 'next/link';

export default function Home() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">TableBooker</p>
        <h1>Find the right table for tonight.</h1>
        <p className="hero-text">
          Discover restaurants, choose a table, and manage your bookings in a
          warm, modern interface designed for easy evenings out.
        </p>
      </div>

      <div className="hero-actions">
        <Link href="/restaurants" className="primary-button">
          Explore restaurants
        </Link>
        <Link href="/bookings" className="secondary-button">
          My bookings
        </Link>
        <Link href="/login" className="ghost-link">
          Login or register
        </Link>
      </div>
    </section>
  );
}
