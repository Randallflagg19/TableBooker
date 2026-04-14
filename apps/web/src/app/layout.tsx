import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';

import './globals.css';
import Providers from './providers';
import AuthSessionBootstrap from '@/features/auth/ui/auth-session-bootstrap';
import SiteHeaderNav from '@/shared/ui/site-header-nav';
import type { Locale } from '@/shared/i18n/messages';

export const metadata: Metadata = {
  title: 'TableBooker',
  description: 'Frontend for the TableBooker booking platform',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('tablebooker_locale')?.value;

  const initialLocale: Locale =
    localeCookie === 'en' || localeCookie === 'ru' ? localeCookie : 'ru';

  return (
    <html lang={initialLocale}>
      <body>
        <Providers initialLocale={initialLocale}>
          <AuthSessionBootstrap />
          <div className="app-shell">
            <header className="site-header">
              <div className="page-container site-header-inner">
                <Link href="/" className="brand">
                  TableBooker
                </Link>
                <SiteHeaderNav />
              </div>
            </header>

            <main className="page-container">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
