/**
 * Small presentational components rendered for real
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { PlayerAvatar } from './player-avatar';
import { PdlChart } from './pdl-chart';
import { WinRateBar } from './win-rate-bar';
import { QueryProvider } from '@/src/providers/query-provider';

describe('PlayerAvatar', () => {
  const PHOTO = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

  it('shows the photo with an accessible description', () => {
    render(<PlayerAvatar name="Alfa" src={PHOTO} />);

    expect(screen.getByRole('img', { name: 'Foto de Alfa' })).toHaveAttribute(
      'src',
      PHOTO
    );
  });

  it('falls back to the icon without a photo or when it fails to load', () => {
    const { container, rerender } = render(
      <PlayerAvatar name="A" src={null} />
    );
    expect(container.querySelector('svg.lucide-user')).toBeInTheDocument();

    rerender(<PlayerAvatar name="A" src="https://example.invalid/x.png" />);
    fireEvent.error(screen.getByRole('img', { name: 'Foto de A' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg.lucide-user')).toBeInTheDocument();
  });
});

describe('PdlChart', () => {
  it('needs at least two daily snapshots', () => {
    render(
      <PdlChart
        data={[{ capturedAt: '2026-10-16T03:00:00Z', leaguePoints: 50 }]}
      />
    );

    expect(
      screen.getByText(/Ainda não há registros de PDL suficientes/)
    ).toBeInTheDocument();
  });

  it('plots the points with dates in pt-BR', () => {
    const { container } = render(
      <PdlChart
        data={[
          { capturedAt: '2026-10-15T12:00:00Z', leaguePoints: 40 },
          { capturedAt: '2026-10-16T12:00:00Z', leaguePoints: 58 },
        ]}
      />
    );

    expect(container.querySelector('.recharts-line')).toBeInTheDocument();
    expect(screen.getByText('15 de out.')).toBeInTheDocument();
  });
});

describe('WinRateBar', () => {
  it('shows the win rate and fills the bar proportionally', () => {
    const { container } = render(<WinRateBar wins={3} losses={1} />);

    expect(screen.getByText('75.0% (3V 1D)')).toBeInTheDocument();
    expect(container.querySelector('[style]')).toHaveStyle({ width: '75%' });
  });

  it('handles a player with no games', () => {
    render(<WinRateBar wins={0} losses={0} />);

    expect(screen.getByText('0.0% (0V 0D)')).toBeInTheDocument();
  });
});

describe('QueryProvider', () => {
  function StaleTime() {
    return (
      <p>{String(useQueryClient().getDefaultOptions().queries?.staleTime)}</p>
    );
  }

  it('creates the app client with a 5-minute stale time by default', () => {
    render(
      <QueryProvider>
        <StaleTime />
      </QueryProvider>
    );

    expect(screen.getByText(String(5 * 60 * 1000))).toBeInTheDocument();
  });
});
