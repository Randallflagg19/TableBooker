import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '@/shared/i18n/locale-provider';
import SiteHeaderNav from '@/shared/ui/site-header-nav';

const mockSetLocale = vi.fn();

vi.mock('@/shared/i18n/locale-storage', () => ({
  setLocale: (...args: unknown[]) => mockSetLocale(...args),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe('SiteHeaderNav', () => {
  it('renders navigation in russian by default', () => {
    render(
      <LocaleProvider initialLocale="ru">
        <SiteHeaderNav />
      </LocaleProvider>,
    );

    expect(screen.getByText('Рестораны')).toBeInTheDocument();
    expect(screen.getByText('Мои бронирования')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RU' })).toBeInTheDocument();
  });

  it('switches navigation to english after click', async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider initialLocale="ru">
        <SiteHeaderNav />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'RU' }));

    expect(screen.getByText('Restaurants')).toBeInTheDocument();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('persists selected locale when toggled', async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider initialLocale="ru">
        <SiteHeaderNav />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'RU' }));

    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });
});
