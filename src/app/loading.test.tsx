import { render, screen } from '@testing-library/react';
import HomeLoading from './loading';
import RankingLoading from './ranking/loading';
import MatchupsLoading from './matchups/loading';
import ProfileLoading from './perfil/[region]/[riotId]/loading';

it.each([
  [HomeLoading, 'Carregando jogadores'],
  [RankingLoading, 'Carregando ranking'],
  [MatchupsLoading, 'Carregando matchups'],
  [ProfileLoading, 'Carregando perfil'],
])('each route shows its placeholder while loading (%#)', (Loading, label) => {
  render(<Loading />);
  expect(screen.getByRole('status', { name: label })).toBeInTheDocument();
});
