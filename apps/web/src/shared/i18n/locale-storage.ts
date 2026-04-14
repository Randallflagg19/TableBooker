import type { Locale } from './messages';

const LOCALE_KEY = 'tablebooker_locale';

export function getLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'ru';
  }

  const storedLocale = window.localStorage.getItem(LOCALE_KEY);

  if (storedLocale === 'ru' || storedLocale === 'en') {
    return storedLocale;
  }

  return 'ru';
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCALE_KEY, locale);
  document.cookie = `${LOCALE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
