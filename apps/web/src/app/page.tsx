import Link from 'next/link';

export default function Home() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">TableBooker</p>
        <h1>Restaurant booking frontend</h1>
        <p className="hero-text">
          A clean frontend shell for authentication, restaurant browsing, and
          booking management.
        </p>
      </div>

      <div className="hero-actions">
        <Link href="/login" className="primary-button">
          Login
        </Link>
        <Link href="/register" className="secondary-button">
          Register
        </Link>
        <Link href="/restaurants" className="ghost-link">
          Browse restaurants
        </Link>
      </div>
    </section>
  );
}
