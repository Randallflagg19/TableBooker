'use client';

import { ReactNode } from 'react';

import QueryProvider from '@/shared/providers/query-provider';
import { LocaleProvider } from '@/shared/i18n/locale-provider';
import type { Locale } from '@/shared/i18n/messages';

type ProvidersProps = {
  children: ReactNode;
  initialLocale: Locale;
};

export default function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <QueryProvider>{children}</QueryProvider>
    </LocaleProvider>
  );
}
