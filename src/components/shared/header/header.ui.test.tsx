/**
 * Header (logo, nav, summoner search, theme selector) rendered for real
 * inside the app's providers.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './header';
import { profileHref } from '@/src/lib/riot-id';
import { renderApp } from '@/jest/render-app';

describe('summoner search', () => {
  it('opens the profile of a valid "Name#TAG" in the selected region', async () => {
    const user = userEvent.setup();
    const { pushed } = renderApp(<Header />);
    const input = screen.getByRole('textbox', { name: /buscar invocador/i });

    await user.type(input, 'Pistola Torta#br1{Enter}');

    expect(pushed).toEqual([profileHref('br1', 'Pistola Torta', 'br1')]);
    expect(input).toHaveValue('');
  });

  it('uses the region picked in the selector', async () => {
    const user = userEvent.setup();
    const { pushed } = renderApp(<Header />);

    await user.click(screen.getByRole('combobox', { name: 'Região' }));
    await user.click(await screen.findByRole('option', { name: 'EUW' }));
    await user.type(
      screen.getByRole('textbox', { name: /buscar invocador/i }),
      'Caps#EUW'
    );
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(pushed).toEqual([profileHref('euw1', 'Caps', 'EUW')]);
  });

  it('explains the expected format when the tag is missing', async () => {
    const user = userEvent.setup();
    const { pushed } = renderApp(<Header />);
    const input = screen.getByRole('textbox', { name: /buscar invocador/i });

    await user.type(input, 'SemTag{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Nome#TAG');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(pushed).toEqual([]);

    // Typing again clears the error
    await user.type(input, '#br1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
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
  it('switches between system, light and dark', async () => {
    const user = userEvent.setup();
    renderApp(<Header />);
    const group = screen.getByRole('radiogroup', { name: 'Tema de cores' });

    await waitFor(() =>
      expect(
        within(group).getByRole('radio', { name: 'Tema do sistema' })
      ).toHaveAttribute('aria-checked', 'true')
    );

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
