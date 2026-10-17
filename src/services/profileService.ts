/**
 * Ranked profile (summoner + Solo/Duo and Flex entries), server only.
 * Shared by /api/profile, /api/rank, /api/refresh, the profile page and the
 * cron through a 10-minute Redis entry. Every fresh read from Riot of a group
 * player also refreshes today's PDL snapshot, so the chart never waits for
 * the end-of-day cron.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { cached, invalidate } from '@/src/lib/cache';
import { leagueApiService } from '@/src/services/leagueApiService';
import { saveSnapshot } from '@/src/services/snapshotService';
import { logger } from '@/src/lib/logger';
import { RIOT_API_CONSTANTS } from '@/src/constants/riotApi';
import type { LeagueEntry } from '@/src/lib/validators';

export type RankedProfile = {
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  rankInfo: LeagueEntry | null;
  flexRankInfo: LeagueEntry | null;
  fetchedAt: string;
};

const profileKey = (riotId: string, region: string) =>
  `perfil:${region}:${riotId.toLowerCase()}`;

async function fetchProfile(
  riotId: string,
  region: string
): Promise<RankedProfile> {
  const puuid = await leagueApiService.getPuuidByRiotId(riotId);
  const [summoner, entries] = await Promise.all([
    leagueApiService.getSummonerByPuuid(puuid, region, riotId),
    leagueApiService.getLeagueEntries(puuid, region),
  ]);
  const byQueue = (queue: string) =>
    entries.find((e) => e.queueType === queue) ?? null;

  const profile: RankedProfile = {
    puuid,
    name: summoner.name,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel,
    rankInfo: byQueue(RIOT_API_CONSTANTS.QUEUE_TYPES.SOLO_DUO),
    flexRankInfo: byQueue(RIOT_API_CONSTANTS.QUEUE_TYPES.FLEX_SR),
    fetchedAt: new Date().toISOString(),
  };

  const [gameName, tagLine = ''] = riotId.split('#');
  const tracked = await prisma.player.findFirst({
    where: {
      gameName: { equals: gameName, mode: 'insensitive' },
      tagLine: { equals: tagLine, mode: 'insensitive' },
    },
    select: { id: true, puuid: true },
  });
  if (tracked) {
    if (!tracked.puuid) {
      await prisma.player.update({
        where: { id: tracked.id },
        data: { puuid },
      });
    }
    await saveSnapshot(tracked.id, [profile.rankInfo, profile.flexRankInfo]);
  }

  return profile;
}

export async function getRankedProfile(
  riotId: string,
  region: string
): Promise<{ profile: RankedProfile; cached: boolean }> {
  const { value, hit } = await cached(
    profileKey(riotId, region),
    RIOT_API_CONSTANTS.CACHE_SECONDS.PROFILE,
    () => fetchProfile(riotId, region)
  );
  return { profile: value, cached: hit };
}

export function invalidateProfile(riotId: string, region: string) {
  return invalidate(profileKey(riotId, region));
}

/** Forced reload: drop the cached entry and read Riot again */
export async function refreshProfile(
  riotId: string,
  region: string
): Promise<RankedProfile> {
  await invalidateProfile(riotId, region);
  return (await getRankedProfile(riotId, region)).profile;
}

export type SnapshotResult = {
  players: number;
  snapshots: number;
  failed: { player: string; error: string }[];
};

/** End-of-day cron: fresh profile (and so today's snapshot) for everyone */
export async function captureDailySnapshots(): Promise<SnapshotResult> {
  const players = await prisma.player.findMany({ where: { active: true } });
  const result: SnapshotResult = {
    players: players.length,
    snapshots: 0,
    failed: [],
  };

  // Players run in parallel; the shared token bucket keeps Riot limits
  await Promise.all(
    players.map(async (player) => {
      const riotId = `${player.gameName}#${player.tagLine}`;
      try {
        const profile = await refreshProfile(riotId, player.region);
        result.snapshots += [profile.rankInfo, profile.flexRankInfo].filter(
          Boolean
        ).length;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Snapshot failed', { riotId, error: message });
        result.failed.push({ player: riotId, error: message });
      }
    })
  );

  logger.info('Daily snapshots captured', { ...result });
  return result;
}
