/**
 * buildGameResumeMatch on a REAL match from the Riot API. Variations (other
 * roles, queues, missing runes...) are copies of that real payload with a
 * single field changed, so the shape stays exactly what Riot sends.
 */

import { leagueApiService } from '@/src/services/leagueApiService';
import { buildGameResumeMatch } from '@/src/lib/match-transformers';
import type { Match, Participant } from '@/src/lib/validators';

const RIOT_ID = 'Alfa#TST';
let puuid: string;
let match: Match;
let me: Participant;

beforeAll(async () => {
  puuid = await leagueApiService.getPuuidByRiotId(RIOT_ID);
  const [matchId] = await leagueApiService.getMatchList(puuid, 0, 1);
  match = await leagueApiService.getMatchDetails(matchId);
  me = match.info.participants.find((p) => p.puuid === puuid)!;
});

/** Real match with my participant (and optionally the match info) changed */
function variant(
  changeMe: Partial<Participant> = {},
  changeInfo: Partial<Match['info']> = {}
): Match {
  const copy = structuredClone(match);
  Object.assign(copy.info, changeInfo);
  Object.assign(
    copy.info.participants.find((p) => p.puuid === puuid)!,
    changeMe
  );
  return copy;
}

const build = (m: Match = match) => buildGameResumeMatch(m, puuid, RIOT_ID);

describe('real match', () => {
  it('describes my game: champion, KDA, CS, result and side', () => {
    const card = build();

    expect(card.matchId).toBe(match.metadata.matchId);
    expect(card.champion).toBe(me.championName);
    expect(card.championImage).toContain(`/champion/${me.championName}.png`);
    expect(card.kda).toBe(`${me.kills}/${me.deaths}/${me.assists}`);
    // CS counts lane minions and jungle monsters, like the in-game score
    expect(card.cs).toBe(
      me.totalMinionsKilled + (me.neutralMinionsKilled ?? 0)
    );
    expect(card.csPerMinute).toBe(
      (card.cs / (match.info.gameDuration / 60)).toFixed(1)
    );
    expect(card.championLevel).toBe(me.champLevel);
    expect(card.result).toBe(me.win ? 'win' : 'loss');
    expect(card.playerSide).toBe(me.teamId === 100 ? 'blue' : 'red');
    expect(card.duration).toMatch(/^\d+:\d{2}$/);
  });

  it('lists both teams (5 vs 5) by their Riot ID names', () => {
    const card = build();
    const named = (team: typeof card.allies) => team.map((p) => p.name);

    expect(card.allies).toHaveLength(5);
    expect(card.enemies).toHaveLength(5);
    expect(named(card.allies)).toEqual(
      match.info.participants
        .filter((p) => p.teamId === me.teamId)
        .map((p) => p.riotIdGameName)
    );
  });

  it('shows only the items actually bought, the trinket apart, and a damage share', () => {
    const card = build();
    const bought = [
      me.item0,
      me.item1,
      me.item2,
      me.item3,
      me.item4,
      me.item5,
    ].filter(Boolean);

    expect(card.items).toHaveLength(bought.length);
    expect(card.trinket?.image).toContain(`/item/${me.item6}.png`);
    expect(build(variant({ item6: 0 })).trinket).toBeNull();
    expect(card.damageShare).toMatch(/^\d{1,3}%$/);
  });

  it('kill participation: my kills + assists over my team kills', () => {
    const teamKills = match.info.participants
      .filter((p) => p.teamId === me.teamId)
      .reduce((sum, p) => sum + p.kills, 0);

    expect(build().killParticipation).toBe(
      Math.round(((me.kills + me.assists) / teamKills) * 100)
    );
  });

  it.each([
    [1, null],
    [2, 'Abate duplo'],
    [3, 'Abate triplo'],
    [4, 'Abate quádruplo'],
    [5, 'Pentakill'],
  ])('largest multikill %i is shown as %s', (largestMultiKill, label) => {
    expect(build(variant({ largestMultiKill })).multiKill).toBe(label);
  });

  it('does not invent an LP change (match-v5 has no LP data)', () => {
    expect(build()).not.toHaveProperty('lp');
  });
});

describe('variations of the real payload', () => {
  it.each([
    ['TOP', 'Topo'],
    ['JUNGLE', 'Selva'],
    ['MIDDLE', 'Meio'],
    ['BOTTOM', 'Atirador'],
    ['UTILITY', 'Suporte'],
    ['', 'Outra'],
  ])('role %s → %s', (teamPosition, label) => {
    expect(build(variant({ teamPosition, individualPosition: '' })).role).toBe(
      label
    );
  });

  it.each([
    [420, 'Ranqueada Solo/Duo'],
    [440, 'Ranqueada Flex'],
    [400, 'Normal'],
    [450, 'ARAM'],
    [1700, 'Arena'],
    [9999, 'Fila 9999'],
  ])('queue %i → %s', (queueId, label) => {
    expect(build(variant({}, { queueId })).queue).toBe(label);
  });

  it.each([
    [30 * 60_000, '30 min atrás'],
    [5 * 3_600_000, '5h atrás'],
    [3 * 86_400_000, '3d atrás'],
  ])('played %ims ago → %s', (ago, label) => {
    expect(
      build(variant({}, { gameStartTimestamp: Date.now() - ago })).playedAt
    ).toBe(label);
  });

  it('without positions (e.g. ARAM) the lane opponent is the first enemy', () => {
    const copy = structuredClone(match);
    for (const p of copy.info.participants) {
      p.teamPosition = '';
      p.individualPosition = '';
    }
    const firstEnemy = copy.info.participants.find(
      (p) => p.teamId !== me.teamId
    )!;

    expect(build(copy).laneOpponent.champion).toBe(firstEnemy.championName);
  });

  it('unknown summoner spells and missing runes get safe defaults', () => {
    const card = build(variant({ summoner1Id: 99999, perks: undefined }));

    expect(card.spells[0].name).toBe('Desconhecido');
    expect(card.runes.primaryTree.name).toBe('Precision');
    // Data Dragon names tree icons by style id (the old path was a 403)
    expect(card.runes.primaryTree.image).toMatch(
      /perk-images\/Styles\/7201_Precision\.png$/
    );
    expect(card.runes.keystone.name).toBe('Precision');
  });

  it('a team with no damage shows 0%', () => {
    const copy = structuredClone(match);
    for (const p of copy.info.participants) p.totalDamageDealtToChampions = 0;

    expect(build(copy).damageShare).toBe('0%');
  });

  it('a team with no kills has 0% kill participation', () => {
    const copy = structuredClone(match);
    for (const p of copy.info.participants) {
      p.kills = 0;
      p.assists = 0;
    }

    expect(build(copy).killParticipation).toBe(0);
  });

  it('players without a Riot ID name fall back to the summoner name, then the PUUID', () => {
    const copy = structuredClone(match);
    const [first, second] = copy.info.participants.filter(
      (p) => p.teamId === me.teamId && p.puuid !== puuid
    );
    first.riotIdGameName = '';
    first.summonerName = 'Nome Antigo';
    second.riotIdGameName = '';
    second.summonerName = '';

    const names = build(copy).allies.map((p) => p.name);
    expect(names).toContain('Nome Antigo');
    expect(names).toContain(second.puuid.slice(0, 8));
  });
});
