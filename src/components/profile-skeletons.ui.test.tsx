/**
 * Loading placeholders of the profile page: each one takes the place of the
 * component that will come in and says what is loading.
 */

import { screen, within } from '@testing-library/react';
import { renderApp } from '@/jest/render-app';
import {
  MatchListSkeleton,
  MatchStatsSkeleton,
  PdlChartSkeleton,
  QueueCardSkeleton,
  SummonerLevelSkeleton,
} from './profile-skeletons';

it.each([
  ['Carregando nível', <SummonerLevelSkeleton key="nivel" />],
  ['Carregando Solo/Duo', <QueueCardSkeleton key="fila" title="Solo/Duo" />],
  ['Carregando histórico de PDL', <PdlChartSkeleton key="pdl" />],
  ['Carregando estatísticas', <MatchStatsSkeleton key="stats" />],
  ['Carregando partidas', <MatchListSkeleton key="partidas" />],
])('announces "%s" while loading', (label, ui) => {
  renderApp(ui);

  const status = screen.getByRole('status', { name: label });
  expect(status).toHaveAttribute('aria-busy', 'true');
  expect(status.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
});

it('the queue placeholder keeps the real title, so the card does not jump', () => {
  renderApp(<QueueCardSkeleton title="Ranqueada Flex" />);

  expect(
    screen.getByRole('heading', { name: 'Ranqueada Flex' })
  ).toBeInTheDocument();
});

it('the stats placeholder has both cards with their titles', () => {
  renderApp(<MatchStatsSkeleton />);

  expect(
    screen.getByRole('heading', { name: 'Campeões mais jogados' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Distribuição de rotas' })
  ).toBeInTheDocument();
});

it('the match list placeholder shows one card per expected match', () => {
  renderApp(<MatchListSkeleton count={3} />);

  const list = screen.getByRole('status', { name: 'Carregando partidas' });
  expect(within(list).getAllByRole('listitem')).toHaveLength(3);
});

it('the PDL placeholder has the chart height', () => {
  renderApp(<PdlChartSkeleton height={110} />);

  expect(
    screen.getByRole('status', { name: 'Carregando histórico de PDL' })
  ).toHaveStyle({ height: '110px' });
});
