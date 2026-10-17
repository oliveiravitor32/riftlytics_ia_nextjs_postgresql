/**
 * Daily snapshots against real Riot + Supabase
 */

import { prisma } from '@/src/lib/db';
import { captureDailySnapshots } from '@/src/services/profileService';
import { leagueApiService } from '@/src/services/leagueApiService';

it('looks up and saves a missing PUUID before capturing the player', async () => {
  const player = await prisma.player.findFirstOrThrow({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  });
  await prisma.player.update({
    where: { id: player.id },
    data: { puuid: null },
  });

  const result = await captureDailySnapshots();

  const saved = await prisma.player.findUniqueOrThrow({
    where: { id: player.id },
  });
  expect(result.failed).toEqual([]);
  expect(saved.puuid).toBe(
    await leagueApiService.getPuuidByRiotId(
      `${player.gameName}#${player.tagLine}`
    )
  );
});
