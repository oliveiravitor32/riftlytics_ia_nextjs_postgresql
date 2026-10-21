/**
 * Zod validation schemas for Riot API responses
 * Ensures type-safe validation of all external data
 */

import { z } from 'zod';

/**
 * summoner-v4 by-puuid response. Riot no longer sends id/accountId/name;
 * the display name comes from the Riot ID (account-v1).
 * https://developer.riotgames.com/apis#summoner-v4
 */
export const SummonerSchema = z.object({
  puuid: z.string(),
  profileIconId: z.number(),
  summonerLevel: z.number(),
  revisionDate: z.number(),
});

export type Summoner = z.infer<typeof SummonerSchema> & { name: string };

/**
 * League entry (rank information)
 */
export const LeagueEntrySchema = z.object({
  // league-v4 by-puuid responses identify the player by puuid;
  // summonerId/summonerName are legacy and may be missing
  puuid: z.string().optional(),
  summonerId: z.string().optional(),
  summonerName: z.string().optional(),
  queueType: z.string(),
  tier: z.string(),
  rank: z.string(),
  leaguePoints: z.number(),
  wins: z.number(),
  losses: z.number(),
  hotStreak: z.boolean().optional(),
  veteran: z.boolean().optional(),
  freshBlood: z.boolean().optional(),
  inactive: z.boolean().optional(),
  leagueId: z.string().optional(),
});

export type LeagueEntry = z.infer<typeof LeagueEntrySchema>;

/**
 * Participant data in a match
 */
export const ParticipantSchema = z.object({
  championName: z.string(),
  championId: z.number(),
  championLevel: z.number().optional(),
  champLevel: z.number().optional(),
  summonerName: z.string().optional(),
  // Riot ID of the player (summonerName is empty for most accounts today)
  riotIdGameName: z.string().optional(),
  riotIdTagline: z.string().optional(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  totalDamageDealtToChampions: z.number(),
  goldEarned: z.number(),
  totalMinionsKilled: z.number(),
  neutralMinionsKilled: z.number().optional(),
  largestMultiKill: z.number().optional(),
  teamPosition: z.string().optional(),
  individualPosition: z.string().optional(),
  teamId: z.number(),
  win: z.boolean(),
  puuid: z.string(),
  summoner1Id: z.number().optional(),
  summoner2Id: z.number().optional(),
  item0: z.number().optional(),
  item1: z.number().optional(),
  item2: z.number().optional(),
  item3: z.number().optional(),
  item4: z.number().optional(),
  item5: z.number().optional(),
  item6: z.number().optional(),
  perks: z
    .object({
      styles: z.array(
        z.object({
          style: z.number(),
          selections: z.array(
            z.object({
              perk: z.number(),
            })
          ),
        })
      ),
    })
    .optional(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * Team data in a match
 */
export const TeamSchema = z.object({
  teamId: z.number(),
  win: z.boolean(),
  bans: z
    .array(
      z.object({
        championId: z.number(),
        pickTurn: z.number(),
      })
    )
    .optional(),
  objectives: z
    .object({
      baron: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
      champion: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
      dragon: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
      inhibitor: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
      riftHerald: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
      tower: z
        .object({
          first: z.boolean(),
          kills: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * Complete match data
 */
export const MatchSchema = z.object({
  metadata: z.object({
    dataVersion: z.string(),
    matchId: z.string(),
    participants: z.array(z.string()),
  }),
  info: z.object({
    endOfGameResult: z.string().optional(),
    gameCreation: z.number(),
    gameDuration: z.number(),
    gameEndTimestamp: z.number(),
    gameId: z.number(),
    gameMode: z.string(),
    gameName: z.string(),
    gameStartTimestamp: z.number(),
    gameType: z.string(),
    gameVersion: z.string(),
    mapId: z.number(),
    participants: z.array(ParticipantSchema),
    platformId: z.string(),
    queueId: z.number(),
    teams: z.array(TeamSchema),
    tournamentCode: z.string().optional(),
  }),
});

export type Match = z.infer<typeof MatchSchema>;

/**
 * Batch get match IDs response
 */
export const MatchIdListSchema = z.array(z.string()).min(0).max(100);

export type MatchIdList = z.infer<typeof MatchIdListSchema>;
