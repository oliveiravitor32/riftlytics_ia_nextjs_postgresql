/**
 * Mock Service Worker setup for API testing
 * Mocks HTTP requests to Riot API
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { config } from '@/src/lib/config';

export const mockSummoner = {
  id: 'test-summoner-id',
  accountId: 'test-account-id',
  puuid: 'test-puuid',
  name: 'TestSummoner',
  profileIconId: 1,
  summonerLevel: 30,
  revisionDate: Date.now(),
};

export const mockLeagueEntry = {
  summonerId: 'test-summoner-id',
  summonerName: 'TestSummoner',
  queueType: 'RANKED_SOLO_5x5',
  tier: 'GOLD',
  rank: 'II',
  leaguePoints: 50,
  wins: 100,
  losses: 90,
};

export const mockMatchList = ['match-1', 'match-2', 'match-3'];

export const mockMatch = {
  metadata: {
    dataVersion: '1.0',
    matchId: 'match-1',
    participants: ['test-puuid'],
  },
  info: {
    gameCreation: Date.now(),
    gameDuration: 1800,
    gameEndTimestamp: Date.now() + 1800000,
    gameId: 123456,
    gameMode: 'CLASSIC',
    gameName: 'Test Game',
    gameStartTimestamp: Date.now(),
    gameType: 'MATCHED_GAME',
    gameVersion: '14.1.1.5420.1',
    mapId: 11,
    platformId: 'NA1',
    queueId: 420,
    participants: [
      {
        championName: 'Ahri',
        championId: 103,
        championLevel: 13,
        kills: 5,
        deaths: 2,
        assists: 8,
        totalDamageDealtToChampions: 15000,
        goldEarned: 12500,
        totalMinionsKilled: 250,
        teamPosition: 'MIDDLE',
        teamId: 100,
        win: true,
        puuid: 'test-puuid',
      },
    ],
    teams: [
      {
        teamId: 100,
        win: true,
      },
    ],
  },
};

// Riot API handlers
export const handlers = [
  // Get summoner by name
  http.get(
    `${config.riotApi.regionalBaseUrl}/riot/account/v1/accounts/by-game-name/:gameName/:tagLine`,
    () => {
      return HttpResponse.json(mockSummoner);
    }
  ),

  // Get summoner by PUUID
  http.get(
    `${config.riotApi.platformBaseUrl}/lol/summoner/v4/summoners/by-puuid/:puuid`,
    () => {
      return HttpResponse.json(mockSummoner);
    }
  ),

  // Get league entries
  http.get(
    `${config.riotApi.platformBaseUrl}/lol/league/v4/entries/by-puuid/:puuid`,
    () => {
      return HttpResponse.json([mockLeagueEntry]);
    }
  ),

  // Get match list
  http.get(
    `${config.riotApi.regionalBaseUrl}/lol/match/v1/matches/by-puuid/:puuid/ids`,
    () => {
      return HttpResponse.json(mockMatchList);
    }
  ),

  // Get match details
  http.get(
    `${config.riotApi.regionalBaseUrl}/lol/match/v1/matches/:matchId`,
    () => {
      return HttpResponse.json(mockMatch);
    }
  ),
];

// Setup MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());
