import { beforeEach, describe, expect, it } from 'vitest';

import { getLocale, setLocale } from '@/shared/i18n/locale-storage';

describe('locale-storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'tablebooker_locale=; path=/; max-age=0';
  });

  it('returns ru by default when nothing is stored', () => {
    expect(getLocale()).toBe('ru');
  });

  it('returns stored locale from localStorage', () => {
    window.localStorage.setItem('tablebooker_locale', 'en');

    expect(getLocale()).toBe('en');
  });

  it('falls back to ru for unsupported values', () => {
    window.localStorage.setItem('tablebooker_locale', 'de');

    expect(getLocale()).toBe('ru');
  });

  it('stores locale in localStorage', () => {
    setLocale('en');

    expect(window.localStorage.getItem('tablebooker_locale')).toBe('en');
  });

  it('stores locale in cookie', () => {
    setLocale('en');

    expect(document.cookie).toContain('tablebooker_locale=en');
  });
});
