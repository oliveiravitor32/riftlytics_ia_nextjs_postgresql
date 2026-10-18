/**
 * Profile page against the real app: server component (Riot + Supabase via
 * our services) plus the client match list hitting the real /api/matches.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage, { generateMetadata } from './page';
import ProfileNotFound from './not-found';
import { ProfileMatches } from '@/src/components/profile-matches';
import { leagueApiService } from '@/src/services/leagueApiService';
import { getPdlHistory } from '@/src/services/snapshotService';
import { getMatchStats } from '@/src/services/matchService';
import { formatTier } from '@/src/lib/rank-labels';
import { toRiotSlug } from '@/src/lib/riot-id';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { GameResumeMatch } from '@/src/components/game-resume-card';
import { renderApp } from '@/jest/render-app';
import { RIOT_WAIT_MS } from '@/jest/timeouts';
import { invalidateProfile } from '@/src/services/profileService';

const PLAYER = { gameName: 'FlyerCloud', tagLine: 'br1', region: 'br1' };
const RIOT_ID = `${PLAYER.gameName}#${PLAYER.tagLine}`;
const params = (region: string, slug: string) => ({
  params: Promise.resolve({ region, riotId: slug }),
});
const playerParams = params(
  PLAYER.region,
  toRiotSlug(PLAYER.gameName, PLAYER.tagLine)
);

async function renderProfile() {
  const result = renderApp(await ProfilePage(playerParams));
  await waitFor(
    () =>
      expect(
        screen.queryByText('Carregando partidas...')
      ).not.toBeInTheDocument(),
    { timeout: RIOT_WAIT_MS }
  );
  return result;
}

const matchItems = () =>
  within(
    screen.getByRole('heading', { name: 'Partidas recentes' })
      .parentElement as HTMLElement
  ).getAllByRole('listitem');

it('header shows the Riot ID, level and region', async () => {
  const puuid = await leagueApiService.getPuuidByRiotId(RIOT_ID);
  const summoner = await leagueApiService.getSummonerByPuuid(
    puuid,
    PLAYER.region,
    RIOT_ID
  );
  await renderProfile();

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(RIOT_ID);
  expect(
    screen.getByText(`Nível ${summoner.summonerLevel} · BR1`)
  ).toBeInTheDocument();
});

it('shows Solo/Duo and Flex ranks from the Riot API', async () => {
  const puuid = await leagueApiService.getPuuidByRiotId(RIOT_ID);
  const entries = await leagueApiService.getLeagueEntries(puuid, PLAYER.region);
  await renderProfile();
  const queues = screen.getByRole('region', { name: 'Elo por fila' });

  for (const [title, queue] of [
    ['Solo/Duo', RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO],
    ['Ranqueada Flex', RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR],
  ]) {
    const card = within(queues)
      .getByRole('heading', { name: title })
      .closest('[data-slot="card"]') as HTMLElement;
    const entry = entries.find((e) => e.queueType === queue);
    if (entry) {
      expect(card).toHaveTextContent(formatTier(entry.tier, entry.rank));
      expect(card).toHaveTextContent(`${entry.leaguePoints} PDL`);
    } else {
      expect(card).toHaveTextContent('Sem ranque nesta fila');
    }
  }
});

it('plots the stored PDL history (or explains it needs more days)', async () => {
  const history = await getPdlHistory(PLAYER.gameName, PLAYER.tagLine);
  const { container } = await renderProfile();

  if (history.length >= 2) {
    expect(container.querySelector('.recharts-line')).toBeInTheDocument();
  } else {
    expect(
      screen.getByText(/Ainda não há registros de PDL suficientes/)
    ).toBeInTheDocument();
  }
});

it('lists the 10 most recent matches', async () => {
  const { matches } = (await (
    await fetch(
      `/api/matches/${encodeURIComponent(RIOT_ID)}?region=br1&start=0&count=10`
    )
  ).json()) as { matches: GameResumeMatch[] };
  await renderProfile();

  expect(matchItems()).toHaveLength(matches.length);
});

it('champion and role stats cover every stored match, not just the page', async () => {
  await renderProfile();
  const stats = await getMatchStats(RIOT_ID);

  expect(
    screen.getByText(`Com base nas ${stats.total} partidas guardadas`)
  ).toBeInTheDocument();

  // The most played champion is listed first, with its stored game count
  const [top] = stats.champions;
  const champions = within(
    screen.getByRole('heading', { name: 'Campeões mais jogados' })
      .parentElement as HTMLElement
  ).getAllByRole('listitem');
  expect(champions[0]).toHaveTextContent(top.champion);
  expect(champions[0]).toHaveTextContent(
    `${top.games} ${top.games === 1 ? 'partida' : 'partidas'}`
  );

  // Role shares add up to ~100%
  const roles = within(
    screen.getByRole('heading', { name: 'Distribuição de rotas' })
      .parentElement as HTMLElement
  ).getAllByRole('listitem');
  const total = roles
    .map((li) => Number(li.textContent!.match(/(\d+)%/)![1]))
    .reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThanOrEqual(98);
  expect(total).toBeLessThanOrEqual(102);
});

it('"Carregar mais partidas" appends the next page', async () => {
  const user = userEvent.setup();
  await renderProfile();
  const before = matchItems().length;

  await user.click(
    screen.getByRole('button', { name: 'Carregar mais partidas' })
  );

  await waitFor(() => expect(matchItems().length).toBeGreaterThan(before), {
    timeout: RIOT_WAIT_MS,
  });
});

describe('not found', () => {
  const NOT_FOUND = { digest: expect.stringContaining('404') };

  it('rejects an invalid slug or region', async () => {
    await expect(ProfilePage(params('br1', 'SemTag'))).rejects.toMatchObject(
      NOT_FOUND
    );
    await expect(
      ProfilePage(params('xx9', toRiotSlug('FlyerCloud', 'br1')))
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it('rejects a real Riot ID that is not in the group', async () => {
    // Played with FlyerCloud; exists on Riot but isn't a tracked player
    await expect(
      ProfilePage(params('br1', toRiotSlug('Arthurmtd', 'br1')))
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it('rejects a group player under the wrong region', async () => {
    await expect(
      ProfilePage(params('na1', toRiotSlug(PLAYER.gameName, PLAYER.tagLine)))
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it('rejects a Riot ID that does not exist', async () => {
    await expect(
      ProfilePage(params('br1', toRiotSlug('zz-nao-existe-321', '0000')))
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it('the not-found page guides the user back home', () => {
    renderApp(<ProfileNotFound />);

    expect(
      screen.getByRole('heading', { name: 'Invocador não encontrado' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute(
      'href',
      '/'
    );
  });
});

it('the page title is the Riot ID', async () => {
  expect((await generateMetadata(playerParams)).title).toBe(RIOT_ID);
  expect((await generateMetadata(params('br1', 'SemTag'))).title).toBe(
    'Perfil'
  );
});

it('match list explains when the matches cannot be loaded', async () => {
  renderApp(
    <ProfileMatches
      riotId="zz-nao-existe-321#0000"
      region="br1"
      stats={{ total: 0, champions: [], roles: [] }}
    />
  );

  expect(
    await screen.findByText(
      /Não foi possível carregar as partidas/,
      undefined,
      {
        timeout: RIOT_WAIT_MS,
      }
    )
  ).toBeInTheDocument();
});

// Riot's 429 can't be triggered safely: only Riot's HTTP answer is faked
it('rate limit shows the friendly alert instead of the profile', async () => {
  const realNodeFetch = globalThis.__nodeFetch;
  globalThis.__nodeFetch = async (input, init) =>
    String(input).includes('riotgames.com')
      ? new Response('{}', { status: 429, headers: { 'Retry-After': '1' } })
      : realNodeFetch(input, init);

  try {
    await invalidateProfile(RIOT_ID, PLAYER.region);
    renderApp(await ProfilePage(playerParams));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tente recarregar a página em 1s'
    );
  } finally {
    globalThis.__nodeFetch = realNodeFetch;
  }
});
