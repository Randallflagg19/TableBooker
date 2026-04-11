import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'TableBooker',
  description: 'Frontend for the TableBooker booking platform',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <div className="app-shell">
            <header className="site-header">
              <div className="page-container site-header-inner">
                <Link href="/" className="brand">
                  TableBooker
                </Link>

                <nav
                  className="site-nav"
                  style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
                >
                  <Link href="/login">Login</Link>
                  <Link href="/register">Register</Link>
                  <Link href="/restaurants">Restaurants</Link>
                  <Link href="/bookings">My Bookings</Link>
                </nav>
              </div>
            </header>

            <main className="page-container">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
