'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import { setLocale } from './locale-storage';
import { messages, type Locale } from './messages';

type LocaleContextValue = {
  locale: Locale;
  setAppLocale: (locale: Locale) => void;
  t: (typeof messages)[Locale];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  children: ReactNode;
  initialLocale: Locale;
};

export function LocaleProvider({
  children,
  initialLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const handleSetLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    setLocale(nextLocale);
  };

  const value: LocaleContextValue = {
    locale,
    setAppLocale: handleSetLocale,
    t: messages[locale],
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return context;
}
