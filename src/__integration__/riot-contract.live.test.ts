/**
 * Contract check against the REAL Riot API: the answers still have the shape
 * our interfaces (src/types/riot-api.ts) and Zod schemas expect. The other
 * suites use mocks built from those interfaces, so this is what notices Riot
 * changing a payload. ~6 requests. Run: npm run test:riot
 */

import { leagueApiService } from '@/src/services/leagueApiService';
import { MatchSchema } from '@/src/lib/validators';
import type {
  AccountDto,
  LeagueEntryDto,
  MatchDto,
  ParticipantDto,
  SummonerDto,
} from '@/src/types/riot-api';

// A real, active account from the group
const RIOT_ID = 'FlyerCloud#br1';
const REGION = 'br1';

const base = 'https://americas.api.riotgames.com';
const platform = `https://${REGION}.api.riotgames.com`;

async function riot<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY! },
  });
  expect(res.status).toBe(200);
  return res.json() as Promise<T>;
}

/** Every key the interface lists is in the real answer */
function hasKeys<T extends object>(value: T, keys: (keyof T)[]) {
  for (const key of keys) expect(value).toHaveProperty(String(key));
}

let puuid: string;

it('account-v1 by-riot-id → AccountDto', async () => {
  const [gameName, tagLine] = RIOT_ID.split('#');
  const account = await riot<AccountDto>(
    `${base}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`
  );
  hasKeys(account, ['puuid', 'gameName', 'tagLine']);
  expect(account.puuid).toHaveLength(78);
  puuid = account.puuid;
});

it('summoner-v4 by-puuid → SummonerDto (and the service parses it)', async () => {
  const summoner = await riot<SummonerDto>(
    `${platform}/lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
  hasKeys(summoner, [
    'puuid',
    'profileIconId',
    'revisionDate',
    'summonerLevel',
  ]);
  await expect(
    leagueApiService.getSummonerByPuuid(puuid, REGION, RIOT_ID)
  ).resolves.toMatchObject({ summonerLevel: summoner.summonerLevel });
});

it('league-v4 entries/by-puuid → LeagueEntryDto[]', async () => {
  const entries = await riot<LeagueEntryDto[]>(
    `${platform}/lol/league/v4/entries/by-puuid/${puuid}`
  );
  for (const entry of entries) {
    // leagueId is documented but not sent (optional in LeagueEntryDto)
    hasKeys(entry, [
      'puuid',
      'queueType',
      'tier',
      'rank',
      'leaguePoints',
      'wins',
      'losses',
      'hotStreak',
      'veteran',
      'freshBlood',
      'inactive',
    ]);
  }
});

it('match-v5 ids and match → MatchDto (and the schema accepts it)', async () => {
  const ids = await riot<string[]>(
    `${base}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`
  );
  expect(ids).toHaveLength(1);

  const match = await riot<MatchDto>(`${base}/lol/match/v5/matches/${ids[0]}`);
  hasKeys(match.metadata, ['dataVersion', 'matchId', 'participants']);
  hasKeys(match.info, [
    'gameCreation',
    'gameDuration',
    'gameStartTimestamp',
    'gameEndTimestamp',
    'queueId',
    'participants',
    'teams',
  ]);
  const keys: (keyof ParticipantDto)[] = [
    'puuid',
    'riotIdGameName',
    'riotIdTagline',
    'teamId',
    'win',
    'championId',
    'championName',
    'teamPosition',
    'kills',
    'deaths',
    'assists',
    'totalMinionsKilled',
    'totalDamageDealtToChampions',
    'summoner1Id',
    'item0',
    'perks',
  ];
  for (const p of match.info.participants) hasKeys(p, keys);
  expect(MatchSchema.safeParse(match).success).toBe(true);
});
