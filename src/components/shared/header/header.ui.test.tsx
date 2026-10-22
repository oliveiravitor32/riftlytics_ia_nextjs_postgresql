/**
 * Header (logo, nav, theme selector) rendered for real
 * inside the app's providers.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './header';
import { renderApp } from '@/jest/render-app';

it('has no summoner search (only the group is tracked for now)', () => {
  renderApp(<Header />);

  expect(screen.queryByRole('search')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

describe('navigation', () => {
  it.each([
    ['/', 'Início'],
    ['/ranking', 'Ranking'],
  ])('marks the current page (%s)', (pathname, current) => {
    renderApp(<Header />, { pathname });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });

    for (const link of within(nav).getAllByRole('link')) {
      if (link.textContent === current) {
        expect(link).toHaveAttribute('aria-current', 'page');
      } else {
        expect(link).not.toHaveAttribute('aria-current');
      }
    }
  });

  it('links to home and ranking; the logo goes home', () => {
    renderApp(<Header />);

    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: 'Ranking' })).toHaveAttribute(
      'href',
      '/ranking'
    );
    expect(
      screen.getByRole('link', { name: /riftlytics, página inicial/i })
    ).toHaveAttribute('href', '/');
  });
});

describe('theme selector', () => {
  it('starts dark, whatever the system theme, until someone picks another', async () => {
    renderApp(<Header />);
    const group = screen.getByRole('radiogroup', { name: 'Tema de cores' });

    await waitFor(() =>
      expect(
        within(group).getByRole('radio', { name: 'Tema escuro' })
      ).toHaveAttribute('aria-checked', 'true')
    );
    expect(document.documentElement).toHaveClass('dark');
  });

  it('switches between system, light and dark', async () => {
    const user = userEvent.setup();
    renderApp(<Header />);
    const group = screen.getByRole('radiogroup', { name: 'Tema de cores' });

    await user.click(
      within(group).getByRole('radio', { name: 'Tema do sistema' })
    );
    expect(
      within(group).getByRole('radio', { name: 'Tema do sistema' })
    ).toHaveAttribute('aria-checked', 'true');

    await user.click(within(group).getByRole('radio', { name: 'Tema escuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(
      within(group).getByRole('radio', { name: 'Tema escuro' })
    ).toHaveAttribute('aria-checked', 'true');

    await user.click(within(group).getByRole('radio', { name: 'Tema claro' }));
    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
